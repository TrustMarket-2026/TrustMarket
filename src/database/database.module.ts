import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() signifie que tous les autres modules peuvent utiliser
// PrismaService sans avoir besoin de l'importer explicitement
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}