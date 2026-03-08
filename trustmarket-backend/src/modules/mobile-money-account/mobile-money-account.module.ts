// ============================================================
//  MobileMoneyAccount Module
//  DEV 2 — Semaine 1
// ============================================================
import { Module } from '@nestjs/common';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { MobileMoneyAccountService } from './mobile-money-account.service';

@Module({
  providers: [
    OrangeMoneyProvider,
    WaveProvider,
    MobileMoneyAccountService,
  ],
  exports: [MobileMoneyAccountService], // ← TransactionsModule en aura besoin
})
export class MobileMoneyAccountModule {}