import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../../database/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);
  private readonly s3Client: S3Client;
  private readonly r2Bucket: string;
  private readonly r2PublicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('transactions') private readonly transactionsQueue: Queue,
  ) {
    // Initialisation du client Cloudflare R2 (compatible AWS S3)
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY') ?? '',
        secretAccessKey: this.configService.get<string>('R2_SECRET_KEY') ?? '',
      },
    });
    this.r2Bucket = this.configService.get<string>('R2_BUCKET') ?? 'trustmarket';
    this.r2PublicUrl = this.configService.get<string>('R2_PUBLIC_URL') ?? '';
  }

  // ─────────────────────────────────────────────
  // 1. Ouvrir un litige
  // ─────────────────────────────────────────────
  async openDispute(userId: string, dto: CreateDisputeDto) {
    this.logger.log(`openDispute → userId=${userId}, transactionId=${dto.transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: { sender: true, receiver: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    // Vérifier que l'utilisateur est acheteur ou vendeur de la transaction
    const isAcheteur = transaction.senderId === userId;
    const isVendeur = transaction.receiverId === userId;
    if (!isAcheteur && !isVendeur) {
      throw new ForbiddenException('Vous n\'êtes pas impliqué dans cette transaction');
    }

    // Vérifier que le status permet d'ouvrir un litige
    const statusAutorisés = ['FUNDS_HELD', 'QR_GENERATED', 'DELIVERED'];
    if (!statusAutorisés.includes(transaction.status)) {
      throw new BadRequestException(
        `Impossible d'ouvrir un litige : status = ${transaction.status} (autorisés : ${statusAutorisés.join(', ')})`,
      );
    }

    // Vérifier qu'il n'y a pas déjà un litige ouvert pour cette transaction
    const existing = await this.prisma.dispute.findFirst({
      where: {
        transactionId: dto.transactionId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });
    if (existing) {
      throw new ConflictException('Un litige est déjà ouvert pour cette transaction');
    }

    // Tout créer dans une transaction Prisma atomique
    const dispute = await this.prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          transactionId: dto.transactionId,
          openedById: userId,
          description: dto.description,
          status: 'OPEN',
          preuves: [],
        },
        include: { openedBy: true, transaction: true },
      });

      // Mettre la transaction en status DISPUTED
      await tx.transaction.update({
        where: { id: dto.transactionId },
        data: { status: 'DISPUTED' },
      });

      return newDispute;
    });

    // Annuler TOUS les jobs BullMQ liés à cette transaction
    const jobsToCancel = [
      `autoRefund:${dto.transactionId}`,
      `releaseFunds:${dto.transactionId}`,
      `checkPaymentReceived:${dto.transactionId}`,
    ];

    for (const jobId of jobsToCancel) {
      try {
        const job = await this.transactionsQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.log(`Job annulé : ${jobId}`);
        }
      } catch (err) {
        this.logger.warn(`Impossible d'annuler le job ${jobId} : ${err.message}`);
      }
    }

    this.logger.log(`Litige ouvert → disputeId=${dispute.id}, transactionId=${dto.transactionId}`);

    // Les notifications (admin + autre partie) sont déclenchées depuis le controller
    return dispute;
  }

  // ─────────────────────────────────────────────
  // 2. Upload d'une preuve vers Cloudflare R2
  // ─────────────────────────────────────────────
  async addEvidence(
    disputeId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    this.logger.log(`addEvidence → disputeId=${disputeId}, userId=${userId}, file=${file.originalname}`);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: true },
    });

    if (!dispute) throw new NotFoundException('Litige introuvable');

    // Vérifier que l'utilisateur est impliqué dans le litige
    const isAcheteur = dispute.transaction.senderId === userId;
    const isVendeur = dispute.transaction.receiverId === userId;
    const isAdmin = dispute.resolvedById === userId;
    if (!isAcheteur && !isVendeur && !isAdmin) {
      throw new ForbiddenException('Vous n\'êtes pas impliqué dans ce litige');
    }

    // Valider le fichier : image ou PDF, max 5MB
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Format non supporté. Utilisez : JPG, PNG, WEBP ou PDF');
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fichier trop volumineux (max 5MB)');
    }

    // Construire la clé R2
    const timestamp = Date.now();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `disputes/${disputeId}/${userId}/${timestamp}-${safeFilename}`;

    // Upload vers Cloudflare R2
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.r2Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    const publicUrl = `${this.r2PublicUrl}/${key}`;

    // Ajouter l'URL dans Dispute.preuves[]
    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        preuves: { push: publicUrl },
      },
    });

    this.logger.log(`Preuve uploadée → ${publicUrl}`);

    return { url: publicUrl };
  }

  // ─────────────────────────────────────────────
  // 3. Résoudre un litige (ADMIN uniquement)
  // ─────────────────────────────────────────────
  async resolveDispute(
    disputeId: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ) {
    this.logger.log(`resolveDispute → disputeId=${disputeId}, adminId=${adminId}, decision=${dto.decision}`);

    // Vérifier que l'admin existe et a bien le role ADMIN
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: { include: { sender: true, receiver: true } } },
    });

    if (!dispute) throw new NotFoundException('Litige introuvable');

    if (!['OPEN', 'IN_PROGRESS'].includes(dispute.status)) {
      throw new BadRequestException(
        `Ce litige ne peut plus être résolu (status: ${dispute.status})`,
      );
    }

    // Mettre à jour le litige
    const newStatus =
      dto.decision === 'RELEASE' ? 'RESOLVED_RELEASE' : 'RESOLVED_REFUND';

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        decision: dto.justification,
        resolvedById: adminId,
      },
      include: { transaction: { include: { sender: true, receiver: true } } },
    });

    this.logger.log(`Litige résolu → decision=${dto.decision}, disputeId=${disputeId}`);

    // Les appels à MobileMoneyAccountService (releaseFunds / refundBuyer)
    // sont déclenchés depuis le controller pour éviter la dépendance circulaire
    return { dispute: updatedDispute, decision: dto.decision };
  }

  // ─────────────────────────────────────────────
  // 4. Liste des litiges de l'utilisateur
  // ─────────────────────────────────────────────
  async getDisputes(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [disputes, total] = await this.prisma.$transaction([
      this.prisma.dispute.findMany({
        where: {
          transaction: {
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        },
        include: {
          openedBy: { select: { id: true, nom: true, prenom: true } },
          transaction: { select: { id: true, montant: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({
        where: {
          transaction: {
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        },
      }),
    ]);

    return {
      data: disputes,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 5. Détail d'un litige
  // ─────────────────────────────────────────────
  async getDisputeById(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: { select: { id: true, nom: true, prenom: true } },
        transaction: { include: { sender: true, receiver: true } },
      },
    });

    if (!dispute) throw new NotFoundException('Litige introuvable');

    // Vérifier que l'utilisateur est impliqué (acheteur, vendeur ou admin)
    const isImplique =
      dispute.transaction.senderId === userId ||
      dispute.transaction.receiverId === userId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    if (!isImplique && !isAdmin) {
      throw new ForbiddenException('Accès refusé');
    }

    return dispute;
  }
}