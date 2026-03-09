import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { MobileMoneyAccountService } from './mobile-money-account.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'transactions' }),
  ],
  providers: [
    OrangeMoneyProvider,
    WaveProvider,
    MobileMoneyAccountService,
  ],
  exports: [MobileMoneyAccountService],
})
export class MobileMoneyAccountModule {}