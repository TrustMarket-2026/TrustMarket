import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    // Pour l'endpoint /admin/disputes/:id/resolve, importer DisputesModule
    // Pour l'endpoint /admin/account-balance, importer MobileMoneyAccountModule (Dev 2)
    // Exemple (décommenter quand les modules seront disponibles) :
    // DisputesModule,
    // MobileMoneyAccountModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}