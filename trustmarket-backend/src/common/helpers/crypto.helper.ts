// ============================================================
//  Crypto Helper — Signatures HMAC-SHA256
//  Utilisé par DEV 2 (webhooks) et DEV 3 (QR Code)
// ============================================================
import * as crypto from 'crypto';

/**
 * Signe un payload avec HMAC-SHA256
 * @param payload - Données à signer (string ou objet)
 * @param secret - Clé secrète
 * @returns Signature hexadécimale
 */
export function signHmac(payload: string | object, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Vérifie qu'une signature HMAC-SHA256 est valide
 * @param payload - Données reçues
 * @param secret - Clé secrète partagée
 * @param signature - Signature reçue dans le header
 * @returns true si valide, false sinon
 */
export function verifyHmac(
  payload: string | object,
  secret: string,
  signature: string,
): boolean {
  const expected = signHmac(payload, secret);
  // Comparaison sécurisée (évite les timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  );
}