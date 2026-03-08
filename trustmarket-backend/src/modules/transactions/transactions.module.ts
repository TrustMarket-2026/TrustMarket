// ============================================================
//  Transactions Module
//  DEV 2 — Semaine 2
// ============================================================
import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { MobileMoneyAccountModule } from '../mobile-money-account/mobile-money-account.module';

@Module({
  imports: [MobileMoneyAccountModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService], // ← Dev 3 en aura besoin
})
export class TransactionsModule {}