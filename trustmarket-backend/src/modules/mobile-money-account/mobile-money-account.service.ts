// ============================================================
//  MobileMoneyAccount Service — Logique escrow TrustMarket
//  DEV 2 — Semaine 1 (corrigé selon schéma Prisma réel)
// ============================================================
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { IMobileMoneyProvider } from './mobile-money-account.interface';
import { commissionHelper } from '../../common/helpers/commission.helper';
import { MobileMoneyLogType, MobileMoneyLogStatus, Operator } from '@prisma/client';

@Injectable()
export class MobileMoneyAccountService {
  private readonly logger = new Logger(MobileMoneyAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly omProvider: OrangeMoneyProvider,
    private readonly waveProvider: WaveProvider,
  ) {}

  // ─── Méthode privée : choisir le bon provider ───────────────
  private getProvider(operator: Operator): IMobileMoneyProvider {
    if (operator === Operator.ORANGE_MONEY) return this.omProvider;
    if (operator === Operator.WAVE) return this.waveProvider;
    throw new Error(`Opérateur inconnu : ${operator}`);
  }

  // ─── Méthode privée : obtenir la référence selon opérateur ──
  private getRef(transaction: { omRef: string | null; waveRef: string | null; operator: Operator }): string {
    if (transaction.operator === Operator.ORANGE_MONEY) return transaction.omRef ?? '';
    if (transaction.operator === Operator.WAVE) return transaction.waveRef ?? '';
    return '';
  }

  // ─── 1. Vérifier qu'un dépôt a bien été reçu ────────────────
  async receiveDeposit(transactionId: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    const provider = this.getProvider(transaction.operator);
    const ref = this.getRef(transaction);
    const paymentStatus = await provider.checkPaymentStatus(ref);

    if (paymentStatus.status === 'SUCCESS') {
      await this.prisma.mobileMoneyLog.create({
        data: {
          transactionId,
          type: MobileMoneyLogType.DEPOSIT_RECEIVED,
          operator: transaction.operator,
          amount: transaction.montant,
          status: MobileMoneyLogStatus.SUCCESS,
        },
      });

      this.logger.log(`✅ Dépôt confirmé — transaction: ${transactionId}`);
      return true;
    }

    this.logger.debug(`⏳ Paiement en attente — ref: ${ref}`);
    return false;
  }

  // ─── 2. Libérer les fonds vers le vendeur ───────────────────
  async releaseFunds(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { receiver: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    const { montantNet, commission } = commissionHelper.calculate(transaction.montant);
    const provider = this.getProvider(transaction.operator);
    const ref = `RELEASE-${transactionId}-${Date.now()}`;

    this.logger.log(
      `💸 Libération fonds — vendeur: ${transaction.receiver.telephone} | montantNet: ${montantNet} FCFA | commission: ${commission} FCFA`,
    );

    const result = await provider.sendMoney(
      transaction.receiver.telephone,
      montantNet,
      ref,
    );

    if (!result.success) {
      await this.prisma.mobileMoneyLog.create({
        data: {
          transactionId,
          type: MobileMoneyLogType.RELEASE_SENT,
          operator: transaction.operator,
          amount: montantNet,
          status: MobileMoneyLogStatus.FAILED,
        },
      });
      throw new Error(`Échec virement vendeur : ${result.message}`);
    }

    await this.prisma.mobileMoneyLog.create({
      data: {
        transactionId,
        type: MobileMoneyLogType.RELEASE_SENT,
        operator: transaction.operator,
        amount: montantNet,
        status: MobileMoneyLogStatus.SUCCESS,
      },
    });

    // Logger aussi la commission retenue
    await this.prisma.mobileMoneyLog.create({
      data: {
        transactionId,
        type: MobileMoneyLogType.COMMISSION_RETAINED,
        operator: transaction.operator,
        amount: commission,
        status: MobileMoneyLogStatus.SUCCESS,
      },
    });

    this.logger.log(`✅ Fonds libérés — transaction: ${transactionId}`);
  }

  // ─── 3. Rembourser l'acheteur (montant total) ───────────────
  async refundBuyer(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { sender: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} introuvable`);
    }

    const provider = this.getProvider(transaction.operator);
    const ref = `REFUND-${transactionId}-${Date.now()}`;

    this.logger.log(
      `🔄 Remboursement — acheteur: ${transaction.sender.telephone} | montant: ${transaction.montant} FCFA`,
    );

    const result = await provider.sendMoney(
      transaction.sender.telephone,
      transaction.montant, // Montant TOTAL, pas de commission
      ref,
    );

    if (!result.success) {
      await this.prisma.mobileMoneyLog.create({
        data: {
          transactionId,
          type: MobileMoneyLogType.REFUND_SENT,
          operator: transaction.operator,
          amount: transaction.montant,
          status: MobileMoneyLogStatus.FAILED,
        },
      });
      throw new Error(`Échec remboursement acheteur : ${result.message}`);
    }

    await this.prisma.mobileMoneyLog.create({
      data: {
        transactionId,
        type: MobileMoneyLogType.REFUND_SENT,
        operator: transaction.operator,
        amount: transaction.montant,
        status: MobileMoneyLogStatus.SUCCESS,
      },
    });

    this.logger.log(`✅ Remboursement effectué — transaction: ${transactionId}`);
  }

  // ─── 4. Solde des comptes TrustMarket ───────────────────────
  async getAccountBalance(): Promise<{ om: number; wave: number }> {
    const [om, wave] = await Promise.all([
      this.omProvider.getBalance(),
      this.waveProvider.getBalance(),
    ]);

    this.logger.debug(`💰 Soldes — OM: ${om} FCFA | Wave: ${wave} FCFA`);
    return { om, wave };
  }
}