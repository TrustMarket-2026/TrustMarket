import { registerAs } from '@nestjs/config';

export default registerAs('mailer', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'TrustMarket <noreply@trustmarket.bf>',
}));