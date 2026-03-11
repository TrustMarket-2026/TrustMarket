import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';

// @Global() permet à EmailService d'être disponible dans tous les modules
// sans avoir à importer NotificationsModule partout
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}