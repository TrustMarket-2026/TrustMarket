import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsProcessor } from './transactions.processor';
import { MobileMoneyAccountModule } from '../mobile-money-account/mobile-money-account.module';
import { OrangeMoneyWebhookController } from '../mobile-money-account/webhooks/orange-money.webhook';
import { WaveWebhookController } from '../mobile-money-account/webhooks/wave.webhook';

@Module({
  imports: [
    MobileMoneyAccountModule,
    BullModule.registerQueue({ name: 'transactions' }),
  ],
  controllers: [
    TransactionsController,
    OrangeMoneyWebhookController,
    WaveWebhookController,
  ],
  providers: [
    TransactionsService,
    TransactionsProcessor,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}