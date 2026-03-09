// ============================================================
//  Wave Provider
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
export class WaveProvider implements IMobileMoneyProvider {
  private readonly logger = new Logger(WaveProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly accountNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WAVE_API_URL', 'https://api.wave.com');
    this.apiKey = this.configService.get<string>('WAVE_API_KEY', 'mock-key');
    this.accountNumber = this.configService.get<string>('WAVE_ACCOUNT_NUMBER', '00000000');
  }

  async checkPaymentStatus(ref: string): Promise<PaymentStatus> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[MOCK] checkPaymentStatus Wave — ref: ${ref}`);
      return { status: 'SUCCESS', amount: 0, ref };
    }

    try {
      this.logger.log(`Vérification paiement Wave — ref: ${ref}`);
      const response = await axios.get(`${this.apiUrl}/v1/payments/${ref}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur checkPaymentStatus Wave: ${error.message}`);
      throw new HttpException('Erreur Wave API', HttpStatus.BAD_GATEWAY);
    }
  }

  async sendMoney(to: string, amount: number, ref: string): Promise<TransferResult> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[MOCK] sendMoney Wave → ${to} | ${amount} FCFA | ref: ${ref}`);
      return { success: true, ref: 'MOCK-WAVE-' + Date.now(), message: 'Virement simulé OK' };
    }

    try {
      this.logger.log(`Virement Wave → ${to} | montant: ${amount} FCFA`);
      const response = await axios.post(
        `${this.apiUrl}/v1/transfers`,
        { recipient_phone: to, amount, currency: 'XOF', client_reference: ref },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur sendMoney Wave: ${error.message}`);
      throw new HttpException('Erreur virement Wave', HttpStatus.BAD_GATEWAY);
    }
  }

  async getBalance(): Promise<number> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug('[MOCK] getBalance Wave → 300000 FCFA');
      return 300000;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/v1/balance`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.data.balance;
    } catch (error) {
      this.logger.error(`Erreur getBalance Wave: ${error.message}`);
      throw new HttpException('Erreur solde Wave', HttpStatus.BAD_GATEWAY);
    }
  }
}