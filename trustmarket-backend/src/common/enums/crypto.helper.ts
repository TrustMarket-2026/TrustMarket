// ============================================================
//  Crypto Helper — Signature HMAC-SHA256
//  Utilisé par DEV 3 pour signer et vérifier les QR Codes
//  Un QR Code signé ne peut pas être falsifié
// ============================================================

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Signe une donnée avec HMAC-SHA256
 * Utilisé pour créer le token du QR Code
 *
 * @param data   - La donnée à signer (ex: transactionId)
 * @param secret - La clé secrète (JWT_SECRET du .env)
 * @returns La signature en hexadécimal (ex: 'a3f9b2...')
 */
export function signHMAC(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Vérifie qu'une signature HMAC est valide
 * Utilise timingSafeEqual pour éviter les attaques timing
 *
 * @param data      - La donnée originale
 * @param signature - La signature à vérifier
 * @param secret    - La clé secrète
 * @returns true si la signature est valide, false sinon
 */
export function verifyHMAC(
  data: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signHMAC(data, secret);

  // timingSafeEqual compare sans révéler d'info par timing
  // (protection contre les attaques par analyse du temps de réponse)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    // Si les buffers ont des tailles différentes, retourne false
    return false;
  }
}

/**
 * Génère un token unique (UUID v4)
 * Utilisé comme identifiant unique pour les QR Codes
 * Exemple : '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUniqueToken(): string {
  return uuidv4();
}