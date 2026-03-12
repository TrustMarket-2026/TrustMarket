import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { otpEmailTemplate } from './templates/otp.template';
import { qrCodeEmailTemplate } from './templates/qrcode.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('mailer.resendApiKey');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('mailer.fromEmail')
      ?? 'TrustMarket <noreply@trustmarket.bf>';
  }

  // ─────────────────────────────────────────
  // ENVOI OTP
  // ─────────────────────────────────────────
  async sendOtp(email: string, prenom: string, otpCode: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `${otpCode} - Votre code de vérification TrustMarket`,
        html: otpEmailTemplate(prenom, otpCode),
      });

      if (error) {
        this.logger.error(`❌ Échec envoi OTP à ${email}: ${error.message}`);
        throw new Error(`Échec envoi email OTP: ${error.message}`);
      }

      this.logger.log(`✅ OTP envoyé à ${email}`);
    } catch (err) {
      this.logger.error(`❌ Erreur envoi OTP: ${err.message}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────
  // ENVOI QR CODE
  // ─────────────────────────────────────────
  async sendQrCode(
    email: string,
    prenom: string,
    montant: number,
    qrCodeBase64: string,
    transactionId: string,
  ): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Votre QR Code TrustMarket - Transaction ${transactionId.slice(0, 8).toUpperCase()}`,
        html: qrCodeEmailTemplate(prenom, montant, qrCodeBase64, transactionId),
      });

      if (error) {
        this.logger.error(`❌ Échec envoi QR Code à ${email}: ${error.message}`);
        throw new Error(`Échec envoi email QR Code: ${error.message}`);
      }

      this.logger.log(`✅ QR Code envoyé à ${email} pour transaction ${transactionId}`);
    } catch (err) {
      this.logger.error(`❌ Erreur envoi QR Code: ${err.message}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────
  // ENVOI CONFIRMATION TRANSACTION
  // ─────────────────────────────────────────
  async sendTransactionConfirmation(
    email: string,
    prenom: string,
    montant: number,
    statut: string,
    transactionId: string,
  ): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Transaction ${statut} - TrustMarket`,
        html: this.transactionTemplate(prenom, montant, statut, transactionId),
      });

      if (error) {
        this.logger.error(`❌ Échec envoi confirmation à ${email}: ${error.message}`);
      } else {
        this.logger.log(`✅ Confirmation transaction envoyée à ${email}`);
      }
    } catch (err) {
      this.logger.error(`❌ Erreur confirmation transaction: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────
  // TEMPLATE TRANSACTION (inline car simple)
  // ─────────────────────────────────────────
  private transactionTemplate(
    prenom: string,
    montant: number,
    statut: string,
    transactionId: string,
  ): string {
    const statutEmoji = statut === 'COMPLETED' ? '✅' : statut === 'REFUNDED' ? '↩️' : '⚠️';
    const statutTexte = statut === 'COMPLETED'
      ? 'Transaction complétée avec succès'
      : statut === 'REFUNDED'
      ? 'Remboursement effectué'
      : `Transaction ${statut}`;

    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px;">
            <h2 style="color: #1a1a2e;">${statutEmoji} ${statutTexte}</h2>
            <p>Bonjour <strong>${prenom}</strong>,</p>
            <p>Votre transaction de <strong>${montant.toLocaleString('fr-FR')} FCFA</strong> a été mise à jour.</p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 12px;">ID Transaction</p>
              <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">${transactionId.toUpperCase()}</p>
            </div>
            <p style="color: #666; font-size: 12px;">L'équipe TrustMarket</p>
          </div>
        </body>
      </html>
    `;
  }
}