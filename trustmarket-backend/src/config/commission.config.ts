import { registerAs } from '@nestjs/config';

export default registerAs('commission', () => ({
  // Taux de commission TrustMarket : 0.5% par transaction
  rate: parseFloat(process.env.COMMISSION_RATE ?? '0.005'),
  // Le QR Code expire après 48h si non scanné
  qrExpiryHours: parseInt(process.env.QR_EXPIRY_HOURS ?? '48', 10),
}));