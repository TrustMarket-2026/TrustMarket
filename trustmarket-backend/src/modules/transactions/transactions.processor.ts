// ============================================================
//  Transactions Processor — 3 Jobs BullMQ
//  DEV 2 — Semaine 3
// ============================================================
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TransactionsService } from './transactions.service';
import { MobileMoneyAccountService } from '../mobile-money-account/mobile-money-account.service';
import { PrismaService } from '../../database/prisma.service';
import { TransactionStatus } from '@prisma/client';

@Processor('transactions')
export class TransactionsProcessor {
  private readonly logger = new Logger(TransactionsProcessor.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly mobileMoneyService: MobileMoneyAccountService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── JOB 1 : Vérifier réception paiement (polling 2 min) ────
  @Process('checkPaymentReceived')
  async checkPaymentReceived(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;
    this.logger.debug(`🔍 [JOB] checkPaymentReceived — transaction: ${transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    // Si la transaction n'est plus en attente → annuler le job
    if (!transaction || transaction.status !== TransactionStatus.INITIATED) {
      this.logger.debug(`⏭️ Transaction ${transactionId} déjà traitée — job annulé`);
      return;
    }

    // Vérifier si le paiement est arrivé
    const received = await this.mobileMoneyService.receiveDeposit(transactionId);

    if (received) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.FUNDS_HELD },
      });
      this.logger.log(`✅ [JOB] Paiement confirmé via polling — transaction: ${transactionId}`);
    } else {
      this.logger.debug(`⏳ [JOB] Paiement toujours en attente — transaction: ${transactionId}`);
    }
  }

  // ─── JOB 2 : Remboursement automatique après 48h ────────────
  @Process('autoRefund')
  async autoRefund(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;
    this.logger.log(`⏰ [JOB] autoRefund déclenché — transaction: ${transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    // Si déjà complétée ou remboursée → ne rien faire
    if (!transaction) return;

    if (
      transaction.status === TransactionStatus.COMPLETED ||
      transaction.status === TransactionStatus.REFUNDED
    ) {
      this.logger.debug(`⏭️ Transaction ${transactionId} déjà finalisée — autoRefund annulé`);
      return;
    }

    // Rembourser l'acheteur
    try {
      await this.transactionsService.refundTransaction(transactionId);
      this.logger.log(`✅ [JOB] Remboursement automatique effectué — transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`❌ [JOB] Échec remboursement auto — transaction: ${transactionId} | ${error.message}`);
      throw error; // BullMQ retentera le job
    }
  }

  // ─── JOB 3 : Libérer les fonds (déclenché par Dev 3) ────────
  @Process('releaseFundsJob')
  async releaseFundsJob(job: Job<{ transactionId: string }>) {
    const { transactionId } = job.data;
    this.logger.log(`💸 [JOB] releaseFundsJob déclenché — transaction: ${transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      this.logger.error(`❌ [JOB] Transaction ${transactionId} introuvable`);
      return;
    }

    if (transaction.status !== TransactionStatus.DELIVERED) {
      this.logger.warn(
        `⚠️ [JOB] Transaction ${transactionId} pas en statut DELIVERED — status actuel: ${transaction.status}`,
      );
      return;
    }

    try {
      await this.transactionsService.markAsCompleted(transactionId);
      this.logger.log(`✅ [JOB] Fonds libérés avec succès — transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`❌ [JOB] Échec libération fonds — transaction: ${transactionId} | ${error.message}`);
      throw error;
    }
  }
}