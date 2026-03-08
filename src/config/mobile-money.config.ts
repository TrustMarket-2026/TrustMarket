import { registerAs } from '@nestjs/config';

export default registerAs('mobileMoney', () => ({
  orangeMoney: {
    apiUrl: process.env.ORANGE_MONEY_API_URL,
    apiKey: process.env.ORANGE_MONEY_API_KEY,
    webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
    // Numéro du compte TrustMarket Orange Money
    accountPhone: process.env.ORANGE_MONEY_ACCOUNT_PHONE,
  },
  wave: {
    apiUrl: process.env.WAVE_API_URL,
    apiKey: process.env.WAVE_API_KEY,
    webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
    // Numéro du compte TrustMarket Wave
    accountPhone: process.env.WAVE_ACCOUNT_PHONE,
  },
}));