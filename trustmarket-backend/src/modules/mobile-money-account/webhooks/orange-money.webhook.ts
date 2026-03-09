// ============================================================
//  Orange Money Webhook Controller
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
export class OrangeMoneyWebhookController {
  private readonly logger = new Logger(OrangeMoneyWebhookController.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('orange-money')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Orange Money — réception paiement' })
  async handleOrangeMoneyWebhook(
    @Body() payload: any,
    @Headers('x-orange-signature') signature: string,
  ) {
    // 1. Vérifier la signature HMAC
    const secret = this.configService.get<string>('OM_WEBHOOK_SECRET', 'dev-secret');

    if (signature) {
      const isValid = verifyHmac(payload, secret, signature);
      if (!isValid) {
        this.logger.warn('❌ Signature Orange Money invalide');
        throw new UnauthorizedException('Signature invalide');
      }
    }

    // 2. Extraire les données du payload
    const { transactionId, status, amount, reference } = payload;

    this.logger.log(
      `📩 Webhook OM reçu — transactionId: ${transactionId} | status: ${status} | montant: ${amount}`,
    );

    // 3. Si paiement réussi → confirmer
    if (status === 'SUCCESS') {
      await this.transactionsService.confirmPaymentReceived(transactionId);
      this.logger.log(`✅ Paiement OM confirmé — transaction: ${transactionId}`);
    }

    return { received: true };
  }
}