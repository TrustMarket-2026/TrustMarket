import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  // ─────────────────────────────────────────
  // INITIALISATION FIREBASE AU DÉMARRAGE
  // ─────────────────────────────────────────
  onModuleInit() {
    try {
      // Évite de réinitialiser si déjà fait
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.apps[0]!;
        this.logger.log('✅ Firebase Admin déjà initialisé');
        return;
      }

      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail = this.configService.get<string>('firebase.clientEmail');
      const privateKey = this.configService.get<string>('firebase.privateKey');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('⚠️ Firebase non configuré — notifications push désactivées');
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Remplace les \n littéraux par de vrais sauts de ligne
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.logger.log('✅ Firebase Admin initialisé avec succès');
    } catch (error) {
      this.logger.error(`❌ Erreur initialisation Firebase: ${error.message}`);
    }
  }

  // ─────────────────────────────────────────
  // ENVOIE UNE NOTIFICATION À UN APPAREIL
  // ─────────────────────────────────────────
  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.warn('⚠️ Firebase non initialisé — notification ignorée');
      return false;
    }

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      this.logger.log(`✅ Notification envoyée : "${title}"`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi notification: ${error.message}`);
      return false;
    }
  }

  // ─────────────────────────────────────────
  // NOTIFICATIONS MÉTIER TRUSTMARKET
  // ─────────────────────────────────────────

  // Notifie l'acheteur que son QR Code est prêt
  async notifyQrCodeReady(
    fcmToken: string,
    montant: number,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '🔐 QR Code prêt !',
      `Votre QR Code pour ${montant.toLocaleString('fr-FR')} FCFA est prêt. Présentez-le au livreur.`,
      { type: 'QR_CODE_READY', transactionId },
    );
  }

  // Notifie le vendeur qu'une transaction est initiée
  async notifyTransactionInitiated(
    fcmToken: string,
    montant: number,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '💰 Nouvelle transaction !',
      `Une transaction de ${montant.toLocaleString('fr-FR')} FCFA a été initiée pour votre article.`,
      { type: 'TRANSACTION_INITIATED', transactionId },
    );
  }

  // Notifie que la transaction est complétée
  async notifyTransactionCompleted(
    fcmToken: string,
    montant: number,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '✅ Transaction complétée !',
      `Votre transaction de ${montant.toLocaleString('fr-FR')} FCFA a été complétée avec succès.`,
      { type: 'TRANSACTION_COMPLETED', transactionId },
    );
  }

  // Notifie qu'un remboursement a été effectué
  async notifyRefund(
    fcmToken: string,
    montant: number,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '↩️ Remboursement effectué',
      `Vous avez été remboursé de ${montant.toLocaleString('fr-FR')} FCFA.`,
      { type: 'REFUND', transactionId },
    );
  }

  // Notifie un livreur d'une nouvelle mission
  async notifyNewDelivery(
    fcmToken: string,
    ville: string,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '🛵 Nouvelle mission de livraison !',
      `Une livraison est disponible à ${ville}. Acceptez-la rapidement !`,
      { type: 'NEW_DELIVERY', transactionId },
    );
  }

  // Notifie qu'un litige a été ouvert
  async notifyDisputeOpened(
    fcmToken: string,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '⚠️ Litige ouvert',
      'Un litige a été ouvert sur votre transaction. Notre équipe va examiner la situation.',
      { type: 'DISPUTE_OPENED', transactionId },
    );
  }

  // Notifie qu'un litige a été résolu
  async notifyDisputeResolved(
    fcmToken: string,
    decision: string,
    transactionId: string,
  ): Promise<void> {
    await this.sendToDevice(
      fcmToken,
      '✅ Litige résolu',
      `Votre litige a été résolu : ${decision}`,
      { type: 'DISPUTE_RESOLVED', transactionId, decision },
    );
  }
}