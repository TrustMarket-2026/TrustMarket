// ============================================================
//  Commission Helper — Calcul des commissions TrustMarket
//  Utilisé par DEV 2 dans le module Transactions
//  Commission : 0.5% par transaction complétée
// ============================================================

/**
 * Calcule la commission TrustMarket
 * Exemple : montant=10000 FCFA → commission=50 FCFA
 *
 * @param amount - Montant total de la transaction en FCFA
 * @param rate   - Taux de commission (défaut: 0.005 = 0.5%)
 * @returns La commission en FCFA (arrondie à l'entier)
 */
export function calculateCommission(
  amount: number,
  rate: number = 0.005,
): number {
  return roundToFCFA(amount * rate);
}

/**
 * Calcule le montant net reçu par le vendeur
 * Exemple : montant=10000 FCFA → montantNet=9950 FCFA
 *
 * @param amount - Montant total de la transaction en FCFA
 * @param rate   - Taux de commission (défaut: 0.005 = 0.5%)
 * @returns Le montant net en FCFA (arrondi à l'entier)
 */
export function calculateNetAmount(
  amount: number,
  rate: number = 0.005,
): number {
  return roundToFCFA(amount - calculateCommission(amount, rate));
}

/**
 * Arrondit un montant à l'entier le plus proche
 * Au Burkina Faso, il n'y a pas de centimes — tout est en FCFA entier
 *
 * @param amount - Montant à arrondir
 * @returns Montant arrondi à l'entier (ex: 49.75 → 50)
 */
export function roundToFCFA(amount: number): number {
  return Math.round(amount);
}

/**
 * Formate un montant en FCFA pour l'affichage
 * Exemple : 10000 → '10 000 FCFA'
 */
export function formatFCFA(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}