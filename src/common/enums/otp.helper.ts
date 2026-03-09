// ============================================================
//  OTP Helper — Codes de vérification 4 chiffres
//  Utilisé pour : inscription, changement mot de passe
//  Envoyé par email via Resend
// ============================================================

/**
 * Génère un code OTP aléatoire à 4 chiffres
 * Exemple : '4821', '0037', '9999'
 */
export function generateOTP(): string {
  // Math.random() donne un nombre entre 0 et 1
  // * 10000 donne un nombre entre 0 et 9999
  // toString().padStart(4, '0') assure toujours 4 chiffres (ex: 37 → '0037')
  const code = Math.floor(Math.random() * 10000);
  return code.toString().padStart(4, '0');
}

/**
 * Calcule la date d'expiration de l'OTP
 * L'OTP expire 10 minutes après sa création
 */
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // +10 minutes
  return expiry;
}

/**
 * Vérifie si un OTP est expiré
 * @param expiry - La date d'expiration stockée en base
 * @returns true si expiré, false si encore valide
 */
export function isOTPExpired(expiry: Date): boolean {
  return new Date() > expiry;
}