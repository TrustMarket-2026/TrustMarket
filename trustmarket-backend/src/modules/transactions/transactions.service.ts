// ============================================================
//  Transactions Service — Cycle de vie + Deep Links
//  DEV 2 — Semaine 2
// ============================================================
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MobileMoneyAccountService } from '../mobile-money-account/mobile-money-account.service';
import { commissionHelper } from '../../common/helpers/commission.helper';
import { detectOperator, formatPhone } from '../../common/helpers/phone.helper';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransactionStatus, Operator } from '@prisma/client';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mobileMoneyService: MobileMoneyAccountService,
  ) {}

  // ─── Méthode privée : générer le deep link ──────────────────
  private generateDeepLink(operator: Operator, phone: string, amount: number): string {
    const formatted = formatPhone(phone).replace('+226', '');
    if (operator === Operator.ORANGE_MONEY) {
      return `omw://transfer?to=${formatted}&amount=${amount}`;
    }
    return `wave://send?phone=${formatted}&amount=${amount}`;
  }

  // ─── Méthode privée : formater la réponse ───────────────────
  private formatResponse(transaction: any, deepLink: string): TransactionResponseDto {
    return {
      id: transaction.id,
      montant: transaction.montant,
      commission: transaction.commission,
      montantNet: transaction.montantNet,
      operator: transaction.operator,
      status: transaction.status,
      description: transaction.description,
      deepLink,
      senderNom: `${transaction.sender.prenom} ${transaction.sender.nom}`,
      receiverNom: `${transaction.receiver.prenom} ${transaction.receiver.nom}`,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  // ─── 1. Créer une transaction ────────────────────────────────
  async createTransaction(
    senderId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    // Vérifier que le receveur existe
    const receiver = await this.prisma.user.findUnique({
      where: { telephone: dto.receiverPhone },
    });

    if (!receiver) {
      throw new NotFoundException(
        `Aucun compte TrustMarket trouvé pour le numéro ${dto.receiverPhone}`,
      );
    }

    if (receiver.id === senderId) {
      throw new BadRequestException('Vous ne pouvez pas vous envoyer de l\'argent à vous-même');
    }

    // Détecter l'opérateur selon le numéro du receveur
    const operator = detectOperator(dto.receiverPhone) as Operator;

    // Calculer commission et montant net
    const { commission, montantNet } = commissionHelper.calculate(dto.montant);

    // Créer la transaction en base
    const transaction = await this.prisma.transaction.create({
      data: {
        montant: dto.montant,
        commission,
        montantNet,
        operator,
        description: dto.description,
        senderId,
        receiverId: receiver.id,
        status: TransactionStatus.INITIATED,
      },
      include: { sender: true, receiver: true },
    });

    // Générer le deep link
    const deepLink = this.generateDeepLink(operator, dto.receiverPhone, dto.montant);

    this.logger.log(
      `✅ Transaction créée — id: ${transaction.id} | montant: ${dto.montant} FCFA | opérateur: ${operator}`,
    );

    return this.formatResponse(transaction, deepLink);
  }

  // ─── 2. Confirmer réception du paiement (appelé par webhook) ─
  async confirmPaymentReceived(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    if (transaction.status !== TransactionStatus.INITIATED) {
      this.logger.warn(`Transaction ${transactionId} déjà traitée — status: ${transaction.status}`);
      return;
    }

    // Vérifier le dépôt auprès du provider
    const received = await this.mobileMoneyService.receiveDeposit(transactionId);

    if (!received) {
      this.logger.warn(`Paiement non confirmé pour transaction ${transactionId}`);
      return;
    }

    // Mettre à jour le statut
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.FUNDS_HELD },
    });

    this.logger.log(`💰 Fonds bloqués — transaction: ${transactionId}`);

    // Dev 3 générera le QR Code après ce statut
    // L'appel à QRCodeService sera fait depuis le webhook (semaine 3)
  }

  // ─── 3. Marquer comme complétée (après scan QR par Dev 3) ───
  async markAsCompleted(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    // Libérer les fonds vers le vendeur
    await this.mobileMoneyService.releaseFunds(transactionId);

    // Mettre à jour le statut
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.COMPLETED },
    });

    this.logger.log(`✅ Transaction complétée — id: ${transactionId}`);
  }

  // ─── 4. Rembourser (expiration 48h ou litige) ───────────────
  async refundTransaction(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Impossible de rembourser une transaction déjà complétée');
    }

    // Rembourser l'acheteur
    await this.mobileMoneyService.refundBuyer(transactionId);

    // Mettre à jour le statut
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.REFUNDED },
    });

    this.logger.log(`🔄 Transaction remboursée — id: ${transactionId}`);
  }

  // ─── 5. Historique des transactions ─────────────────────────
  async getHistory(userId: string): Promise<TransactionResponseDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => {
      const deepLink = this.generateDeepLink(t.operator, t.receiver.telephone, t.montant);
      return this.formatResponse(t, deepLink);
    });
  }

  // ─── 6. Détail d'une transaction ────────────────────────────
  async getById(transactionId: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { sender: true, receiver: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    // Vérifier que l'utilisateur est bien concerné par cette transaction
    if (transaction.senderId !== userId && transaction.receiverId !== userId) {
      throw new BadRequestException('Accès non autorisé à cette transaction');
    }

    const deepLink = this.generateDeepLink(
      transaction.operator,
      transaction.receiver.telephone,
      transaction.montant,
    );

    return this.formatResponse(transaction, deepLink);
  }
}