import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GenerateQrDto } from './dto/generate-qr.dto';

@Injectable()
export class QrcodeService {
  private readonly logger = new Logger(QrcodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('transactions') private readonly transactionsQueue: Queue,
  ) {}

  // ─────────────────────────────────────────────
  // 1. generateQR — appelé après FUNDS_HELD
  // ─────────────────────────────────────────────
  async generateQR(
    transactionId: string,
  ): Promise<{ qrImageBase64: string; token: string; expiresAt: Date }> {
    this.logger.log(`generateQR → transactionId=${transactionId}`);

    // Vérifier que la transaction existe et est en status FUNDS_HELD
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { receiver: true, sender: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    if (transaction.status !== 'FUNDS_HELD') {
      throw new BadRequestException(
        `Impossible de générer un QR Code : status actuel = ${transaction.status} (attendu: FUNDS_HELD)`,
      );
    }

    // Vérifier si un QR Code actif existe déjà (idempotence)
    const existingQR = await this.prisma.qRCode.findUnique({
      where: { transactionId },
    });
    if (existingQR && !existingQR.isUsed) {
      this.logger.warn(
        `QR Code déjà généré pour transactionId=${transactionId}, régénération de l'image`,
      );
      const qrImageBase64 = await this._generateQRImage(
        existingQR.token,
        transactionId,
        existingQR.expiresAt,
      );
      return { qrImageBase64, token: existingQR.token, expiresAt: existingQR.expiresAt };
    }

    // Créer un token unique signé HMAC-SHA256
    const { signHMAC, generateUniqueToken } = await import('../../common/helpers/crypto.helper');
    const secret = this.configService.get<string>('JWT_SECRET') ?? 'trustmarket-secret';
    const uuid = generateUniqueToken();
    const timestamp = Date.now().toString();
    const rawData = `${uuid}:${transactionId}:${timestamp}`;
    const signature = signHMAC(rawData, secret);
    const token = `${uuid}.${timestamp}.${signature}`;

    // Expiration 48h
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Créer QRCode en DB (dans une transaction Prisma atomique)
    await this.prisma.$transaction(async (tx) => {
      await tx.qRCode.create({
        data: {
          token,
          transactionId,
          isUsed: false,
          expiresAt,
        },
      });

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'QR_GENERATED' },
      });
    });

    // Générer l'image QR Code en base64
    const qrImageBase64 = await this._generateQRImage(token, transactionId, expiresAt);

    // Déclencher le job autoRefund avec délai 48h
    await this.transactionsQueue.add(
      'autoRefund',
      { transactionId },
      {
        delay: 48 * 60 * 60 * 1000,
        jobId: `autoRefund:${transactionId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`QR Code généré avec succès → transactionId=${transactionId}, expiresAt=${expiresAt.toISOString()}`);

    // Notifier le vendeur (push + email avec QR en PJ)
    // NotificationsService sera injecté via circular dependency guard
    // Appel déclenché par TransactionsService après generateQR()

    return { qrImageBase64, token, expiresAt };
  }

  // ─────────────────────────────────────────────
  // 2. validateScan — appelé par l'ACHETEUR
  // ─────────────────────────────────────────────
  async validateScan(
    token: string,
    buyerId: string,
  ): Promise<{ success: boolean; transaction: any }> {
    this.logger.log(`validateScan → buyerId=${buyerId}`);

    // Trouver le QR Code par token
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { token },
      include: {
        transaction: {
          include: { sender: true, receiver: true },
        },
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR Code invalide');
    }

    // Vérifier usage unique
    if (qrCode.isUsed) {
      throw new ConflictException('QR Code déjà utilisé');
    }

    // Vérifier expiration
    if (qrCode.expiresAt < new Date()) {
      throw new BadRequestException('QR Code expiré (valable 48h uniquement)');
    }

    const { transaction } = qrCode;

    // Vérifier que c'est bien l'acheteur (senderId) qui scanne
    if (transaction.senderId !== buyerId) {
      throw new ForbiddenException("Seul l'acheteur peut scanner ce QR Code");
    }

    // Vérifier la signature HMAC du token
    const { verifyHMAC } = await import('../../common/helpers/crypto.helper');
    const secret = this.configService.get<string>('JWT_SECRET') ?? 'trustmarket-secret';
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Format de token invalide');
    }
    const [uuid, timestamp, signature] = parts;
    const rawData = `${uuid}:${transaction.id}:${timestamp}`;
    const isValidSignature = verifyHMAC(rawData, signature, secret);
    if (!isValidSignature) {
      throw new ForbiddenException('Signature du QR Code invalide');
    }

    // Tout est valide → mettre à jour dans une transaction atomique
    const updatedTransaction = await this.prisma.$transaction(async (tx) => {
      await tx.qRCode.update({
        where: { id: qrCode.id },
        data: {
          isUsed: true,
          scannedAt: new Date(),
          scannedByBuyerId: buyerId,
        },
      });

      return tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'DELIVERED' },
        include: { sender: true, receiver: true },
      });
    });

    // Annuler le job autoRefund
    try {
      const autoRefundJob = await this.transactionsQueue.getJob(
        `autoRefund:${transaction.id}`,
      );
      if (autoRefundJob) {
        await autoRefundJob.remove();
        this.logger.log(`Job autoRefund annulé → transactionId=${transaction.id}`);
      }
    } catch (error) {
      this.logger.warn(`Impossible d'annuler le job autoRefund: ${error.message}`);
    }

    // Déclencher le job releaseFunds (Dev 2)
    await this.transactionsQueue.add(
      'releaseFunds',
      { transactionId: transaction.id },
      {
        jobId: `releaseFunds:${transaction.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Scan validé → transactionId=${transaction.id}, status=DELIVERED`);

    return { success: true, transaction: updatedTransaction };
  }

  // ─────────────────────────────────────────────
  // 3. getQRCodeForTransaction — récupération vendeur
  // ─────────────────────────────────────────────
  async getQRCodeForTransaction(
    transactionId: string,
    userId: string,
  ): Promise<{
    qrImageBase64: string;
    expiresAt: Date;
    isUsed: boolean;
    timeRemaining: string;
  }> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    // Vérifier que c'est bien le vendeur (receiverId)
    if (transaction.receiverId !== userId) {
      throw new ForbiddenException('Accès refusé : vous n\'êtes pas le vendeur de cette transaction');
    }

    const qrCode = await this.prisma.qRCode.findUnique({
      where: { transactionId },
    });

    if (!qrCode) {
      throw new NotFoundException('Aucun QR Code trouvé pour cette transaction');
    }

    // Régénérer l'image depuis le token
    const qrImageBase64 = await this._generateQRImage(
      qrCode.token,
      transactionId,
      qrCode.expiresAt,
    );

    const timeRemaining = this._formatTimeRemaining(qrCode.expiresAt);

    return {
      qrImageBase64,
      expiresAt: qrCode.expiresAt,
      isUsed: qrCode.isUsed,
      timeRemaining,
    };
  }

  // ─────────────────────────────────────────────
  // Méthodes privées utilitaires
  // ─────────────────────────────────────────────

  private async _generateQRImage(
    token: string,
    transactionId: string,
    expiresAt: Date,
  ): Promise<string> {
    try {
      const qrContent = JSON.stringify({ token, transactionId, expiresAt });
      const qrDataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      // Retourner uniquement la partie base64 (sans le préfixe data:image/png;base64,)
      return qrDataUrl.replace(/^data:image\/png;base64,/, '');
    } catch (error) {
      this.logger.error(`Erreur génération image QR: ${error.message}`);
      throw new InternalServerErrorException('Impossible de générer l\'image QR Code');
    }
  }

  private _formatTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expiré';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    }
    return `${minutes}min restantes`;
  }
}