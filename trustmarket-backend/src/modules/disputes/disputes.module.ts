import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'transactions', // Queue partagée avec Dev 2
    }),
    // Multer en mémoire — le buffer est envoyé directement vers R2
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Format non supporté : utilisez JPG, PNG, WEBP ou PDF'), false);
        }
      },
    }),
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService], // Exporté pour AdminService (semaine 4)
})
export class DisputesModule {}