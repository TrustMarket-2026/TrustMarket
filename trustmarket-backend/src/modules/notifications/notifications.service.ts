import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { FcmService } from './fcm.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private emailService: EmailService,
    private fcmService: FcmService,
    private prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────
  // NOTIFIE UN UTILISATEUR (EMAIL + PUSH)
  // ─────────────────────────────────────────
  async notifyUser(
    userId: string,
    type: 'PAYMENT' | 'INFO' | 'ALERT' | 'DELIVERY' | 'DISPUTE',
    data: {
      montant?: number;
      transactionId?: string;
      decision?: string;
      qrCodeBase64?: string;
      ville?: string;
      message?: string;
    },
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return;

      await this.prisma.notification.create({
        data: {
          userId,
          type: type as any,
          titre: this.getTitre(type),
          message: this.getMessage(type, data),
          isRead: false,
        },
      });

      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, type, data);
      }

      await this.sendEmailNotification(user, type, data);

    } catch (error) {
      this.logger.error(`❌ Erreur notification utilisateur ${userId}: ${error.message}`);
    }
  }

  // ─────────────────────────────────────────
  // MÉTHODES PRIVÉES
  // ─────────────────────────────────────────
  private async sendPushNotification(
    fcmToken: string,
    type: string,
    data: any,
  ): Promise<void> {
    switch (type) {
      case 'PAYMENT':
        await this.fcmService.notifyTransactionCompleted(fcmToken, data.montant, data.transactionId);
        break;
      case 'ALERT':
        await this.fcmService.notifyRefund(fcmToken, data.montant, data.transactionId);
        break;
      case 'DELIVERY':
        await this.fcmService.notifyNewDelivery(fcmToken, data.ville ?? '', data.transactionId);
        break;
      case 'DISPUTE':
        await this.fcmService.notifyDisputeOpened(fcmToken, data.transactionId);
        break;
      case 'INFO':
        await this.fcmService.sendToDevice(fcmToken, 'TrustMarket', data.message ?? '', {});
        break;
    }
  }

  private async sendEmailNotification(user: any, type: string, data: any): Promise<void> {
    switch (type) {
      case 'PAYMENT':
        if (data.qrCodeBase64) {
          await this.emailService.sendQrCode(
            user.email,
            user.prenom,
            data.montant,
            data.qrCodeBase64,
            data.transactionId,
          );
        } else {
          await this.emailService.sendTransactionConfirmation(
            user.email,
            user.prenom,
            data.montant,
            'COMPLETED',
            data.transactionId,
          );
        }
        break;
      case 'ALERT':
        await this.emailService.sendTransactionConfirmation(
          user.email,
          user.prenom,
          data.montant,
          'REFUNDED',
          data.transactionId,
        );
        break;
    }
  }

  private getTitre(type: string): string {
    const titres: Record<string, string> = {
      PAYMENT: 'Paiement effectué',
      INFO: 'Information',
      ALERT: 'Alerte',
      DELIVERY: 'Livraison',
      DISPUTE: 'Litige',
    };
    return titres[type] ?? 'Notification TrustMarket';
  }

  private getMessage(type: string, data: any): string {
    switch (type) {
      case 'PAYMENT':
        return `Transaction de ${data.montant?.toLocaleString('fr-FR')} FCFA complétée.`;
      case 'ALERT':
        return `Remboursement de ${data.montant?.toLocaleString('fr-FR')} FCFA effectué.`;
      case 'DELIVERY':
        return 'Nouvelle mise à jour sur votre livraison.';
      case 'DISPUTE':
        return 'Un litige a été ouvert sur votre transaction.';
      case 'INFO':
        return data.message ?? 'Nouvelle notification TrustMarket';
      default:
        return 'Nouvelle notification TrustMarket';
    }
  }
}