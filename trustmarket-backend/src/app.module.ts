import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';

// Configs
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import commissionConfig from './config/commission.config';
import mobileMoneyConfig from './config/mobile-money.config';
import mailerConfig from './config/mailer.config';
import storageConfig from './config/storage.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        commissionConfig,
        mobileMoneyConfig,
        mailerConfig,
        storageConfig,
      ],
    }),
    DatabaseModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL ?? 'redis://localhost:6379',
        },
      }),
    }),

    // ─── Modules métier ──────────────────────────────────
    NotificationsModule,  // ✅ Prompt 1-6 — Global, disponible partout
    AuthModule,           // ✅ Prompt 1-5
    // UsersModule        // 🔜 Prompt 1-7
    // MobileMoneyModule  // 🔜 DEV 2
    // TransactionsModule // 🔜 DEV 2
    // QRCodeModule       // 🔜 DEV 3
    // DeliveryModule     // 🔜 DEV 3
    // DisputesModule     // 🔜 DEV 3
  ],
})
export class AppModule {}