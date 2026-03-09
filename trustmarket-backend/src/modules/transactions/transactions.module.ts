// ============================================================
//  Transactions Module — mis à jour semaine 3
// ============================================================
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsProcessor } from './transactions.processor';
import { MobileMoneyAccountModule } from '../mobile-money-account/mobile-money-account.module';

@Module({
  imports: [
    MobileMoneyAccountModule,
    BullModule.registerQueue({ name: 'transactions' }),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsProcessor,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}