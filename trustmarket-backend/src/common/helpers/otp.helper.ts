// Génère un code OTP à 4 chiffres
export function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Retourne la date d'expiration (maintenant + 10 minutes)
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

// Vérifie si l'OTP est expiré
export function isOTPExpired(expiry: Date): boolean {
  return new Date() > expiry;
}