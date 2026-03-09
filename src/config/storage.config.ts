import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKey: process.env.R2_ACCESS_KEY,
  secretKey: process.env.R2_SECRET_KEY,
  bucket: process.env.R2_BUCKET || 'trustmarket-preuves',
  publicUrl: process.env.R2_PUBLIC_URL,
  // URL endpoint R2 (format Cloudflare)
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
}));