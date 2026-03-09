// ============================================================
//  MobileMoneyAccount Module — mis à jour semaine 3
// ============================================================
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { MobileMoneyAccountService } from './mobile-money-account.service';
import { OrangeMoneyWebhookController } from './webhooks/orange-money.webhook';
import { WaveWebhookController } from './webhooks/wave.webhook';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'transactions' }),
  ],
  controllers: [
    OrangeMoneyWebhookController,
    WaveWebhookController,
  ],
  providers: [
    OrangeMoneyProvider,
    WaveProvider,
    MobileMoneyAccountService,
  ],
  exports: [MobileMoneyAccountService],
})
export class MobileMoneyAccountModule {}