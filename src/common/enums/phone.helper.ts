// ============================================================
//  Phone Helper — Numéros de téléphone burkinabè
//  Utilisé par DEV 2 pour détecter l'opérateur Mobile Money
//  et générer les bons deep links (OM ou Wave)
// ============================================================

/**
 * Détecte l'opérateur Mobile Money d'un numéro burkinabè
 *
 * Règles Burkina Faso :
 * - Orange Money : commence par 07, 05, 03 (ex: 07 XX XX XX)
 * - Wave         : commence par 01, 02     (ex: 01 XX XX XX)
 *
 * @param phone - Numéro de téléphone (formats acceptés: '07XXXXXXXX', '+22607XXXXXXXX', '0022607XXXXXXXX')
 * @returns 'ORANGE_MONEY' ou 'WAVE'
 * @throws Error si le numéro n'est pas reconnu
 */
export function detectOperator(phone: string): 'ORANGE_MONEY' | 'WAVE' {
  // Normalise d'abord le numéro pour avoir juste les 8 derniers chiffres
  const normalized = formatPhone(phone);

  // Extrait les 2 premiers chiffres après +226
  // +226 07 XX XX XX → on prend '07'
  const localNumber = normalized.replace('+226', '');
  const prefix = localNumber.substring(0, 2);

  const orangePrefixes = ['07', '05', '03', '06'];
  const wavePrefixes = ['01', '02'];

  if (orangePrefixes.includes(prefix)) {
    return 'ORANGE_MONEY';
  }

  if (wavePrefixes.includes(prefix)) {
    return 'WAVE';
  }

  throw new Error(
    `Opérateur non reconnu pour le numéro ${phone}. ` +
    `Préfixes Orange Money : 07, 05, 03, 06. Préfixes Wave : 01, 02.`,
  );
}

/**
 * Normalise un numéro de téléphone burkinabè au format international
 * Tous les formats → +226XXXXXXXX
 *
 * Exemples :
 * '07XXXXXXXX'        → '+22607XXXXXXXX'
 * '0022607XXXXXXXX'   → '+22607XXXXXXXX'
 * '+22607XXXXXXXX'    → '+22607XXXXXXXX' (déjà bon)
 *
 * @param phone - Numéro dans n'importe quel format
 * @returns Numéro au format +226XXXXXXXX
 */
export function formatPhone(phone: string): string {
  // Supprime tous les espaces et tirets
  let cleaned = phone.replace(/[\s\-\.]/g, '');

  // Déjà au bon format
  if (cleaned.startsWith('+226')) {
    return cleaned;
  }

  // Format 00226XXXXXXXX
  if (cleaned.startsWith('00226')) {
    return '+' + cleaned.substring(2);
  }

  // Format local 0XXXXXXXX (8 chiffres avec le 0 devant)
  if (cleaned.startsWith('0') && cleaned.length === 8) {
    return '+226' + cleaned;
  }

  // Format local sans 0 devant (7 chiffres)
  if (cleaned.length === 8) {
    return '+226' + cleaned;
  }

  // Si aucun format reconnu, retourne tel quel
  return cleaned;
}

/**
 * Vérifie si un numéro est un numéro burkinabè valide
 *
 * @param phone - Numéro à valider
 * @returns true si valide, false sinon
 */
export function isValidBurkinaPhone(phone: string): boolean {
  try {
    const normalized = formatPhone(phone);
    // Un numéro burkinabè valide : +226 suivi de 8 chiffres
    const regex = /^\+226[0-9]{8}$/;
    return regex.test(normalized);
  } catch {
    return false;
  }
}