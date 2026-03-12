import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  providers: [
    EmailService,
    FcmService,
    NotificationsService,
  ],
  exports: [
    EmailService,       // Pour AuthService (OTP)
    FcmService,         // Pour DEV 2 et DEV 3
    NotificationsService, // Service centralisé
  ],
})
export class NotificationsModule {}