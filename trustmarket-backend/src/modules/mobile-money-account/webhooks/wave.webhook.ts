// ============================================================
//  Wave Webhook Controller
//  DEV 2 — Semaine 3
// ============================================================
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from '../../transactions/transactions.service';
import { verifyHmac } from '../../../common/helpers/crypto.helper';

@ApiTags('webhooks')
@Controller('webhooks')
export class WaveWebhookController {
  private readonly logger = new Logger(WaveWebhookController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('wave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Wave — réception paiement' })
  async handleWaveWebhook(
    @Body() payload: any,
    @Headers('x-wave-signature') signature: string,
  ) {
    // 1. Vérifier la signature HMAC
    const secret = this.configService.get<string>('WAVE_WEBHOOK_SECRET', 'dev-secret');

    if (signature) {
      const isValid = verifyHmac(payload, secret, signature);
      if (!isValid) {
        this.logger.warn('❌ Signature Wave invalide');
        throw new UnauthorizedException('Signature invalide');
      }
    }

    // 2. Extraire les données du payload Wave
    // Wave utilise des noms de champs différents d'Orange Money
    const transactionId = payload.client_reference || payload.transactionId;
    const status = payload.payment_status || payload.status;
    const amount = payload.amount;

    this.logger.log(
      `📩 Webhook Wave reçu — transactionId: ${transactionId} | status: ${status} | montant: ${amount}`,
    );

    // 3. Si paiement réussi → confirmer
    if (status === 'succeeded' || status === 'SUCCESS') {
      await this.transactionsService.confirmPaymentReceived(transactionId);
      this.logger.log(`✅ Paiement Wave confirmé — transaction: ${transactionId}`);
    }

    return { received: true };
  }
}