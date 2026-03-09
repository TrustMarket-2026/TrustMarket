import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  // Se connecte à la base de données quand l'application démarre
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connecté à PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Impossible de se connecter à PostgreSQL', error);
      throw error;
    }
  }

  // Se déconnecte proprement quand l'application s'arrête
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Déconnecté de PostgreSQL');
  }
}