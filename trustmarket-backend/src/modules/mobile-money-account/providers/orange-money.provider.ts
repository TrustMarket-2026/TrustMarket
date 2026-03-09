// ============================================================
//  Orange Money Provider
//  DEV 2 — Semaine 1
// ============================================================
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IMobileMoneyProvider,
  PaymentStatus,
  TransferResult,
} from '../mobile-money-account.interface';

@Injectable()
export class OrangeMoneyProvider implements IMobileMoneyProvider {
  private readonly logger = new Logger(OrangeMoneyProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly accountNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('OM_API_URL', 'https://api.orange-money.bf');
    this.apiKey = this.configService.get<string>('OM_API_KEY', 'mock-key');
    this.accountNumber = this.configService.get<string>('OM_ACCOUNT_NUMBER', '00000000');
  }

  async checkPaymentStatus(ref: string): Promise<PaymentStatus> {
    // MODE DEV : retourner un mock
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[MOCK] checkPaymentStatus OM — ref: ${ref}`);
      return { status: 'SUCCESS', amount: 0, ref };
    }

    try {
      this.logger.log(`Vérification paiement OM — ref: ${ref}`);
      const response = await axios.get(`${this.apiUrl}/payments/${ref}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur checkPaymentStatus OM: ${error.message}`);
      throw new HttpException('Erreur Orange Money API', HttpStatus.BAD_GATEWAY);
    }
  }

  async sendMoney(to: string, amount: number, ref: string): Promise<TransferResult> {
    // MODE DEV : retourner un mock
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[MOCK] sendMoney OM → ${to} | ${amount} FCFA | ref: ${ref}`);
      return { success: true, ref: 'MOCK-OM-' + Date.now(), message: 'Virement simulé OK' };
    }

    try {
      this.logger.log(`Virement OM → ${to} | montant: ${amount} FCFA`);
      const response = await axios.post(
        `${this.apiUrl}/transfers`,
        { to, amount, reference: ref, from: this.accountNumber },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur sendMoney OM: ${error.message}`);
      throw new HttpException('Erreur virement Orange Money', HttpStatus.BAD_GATEWAY);
    }
  }

  async getBalance(): Promise<number> {
    // MODE DEV : retourner un mock
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug('[MOCK] getBalance OM → 500000 FCFA');
      return 500000;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/balance`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.data.balance;
    } catch (error) {
      this.logger.error(`Erreur getBalance OM: ${error.message}`);
      throw new HttpException('Erreur solde Orange Money', HttpStatus.BAD_GATEWAY);
    }
  }
}