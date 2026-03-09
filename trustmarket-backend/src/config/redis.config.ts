import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  // Options de connexion pour BullMQ
  options: {
    maxRetriesPerRequest: null, // Requis par BullMQ
    retryStrategy: (times: number) => {
      // Réessaie de se connecter toutes les 2 secondes, max 10 fois
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  },
}));