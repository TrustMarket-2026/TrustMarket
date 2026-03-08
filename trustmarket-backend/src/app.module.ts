import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { MobileMoneyAccountModule } from './modules/mobile-money-account/mobile-money-account.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

// Configs
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import commissionConfig from './config/commission.config';
import mobileMoneyConfig from './config/mobile-money.config';
import mailerConfig from './config/mailer.config';
import storageConfig from './config/storage.config';

// Database
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    // ── Configuration globale ──────────────────────────────
    // isGlobal: true → accessible dans tous les modules sans réimporter
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
      // Le fichier .env à la racine du projet
      envFilePath: '.env',
    }),

    // ── Base de données PostgreSQL (global) ────────────────
    DatabaseModule,

    // ── Redis + BullMQ (jobs asynchrones) ─────────────────
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
          port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port) || 6379,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    // ── Les autres modules seront ajoutés ici au fur et à mesure ──
    // AuthModule,        ← Semaine 2 (DEV 1)
    // UsersModule,       ← Semaine 3 (DEV 1)
    // NotificationsModule, ← Semaine 4 (DEV 1)
    TransactionsModule,
    MobileMoneyAccountModule,
    // QrCodeModule,      ← Semaine 1 (DEV 3)
    // DeliveryModule,    ← Semaine 2 (DEV 3)
    // DisputesModule,    ← Semaine 3 (DEV 3)
    // AdminModule,       ← Semaine 4 (DEV 3)
  ],
})
export class AppModule {}