export const commissionHelper = {
  /**
   * Calcule la commission TrustMarket (0.5%)
   * @param montant - Montant brut en FCFA
   * @returns { commission, montantNet }
   */
  calculate(montant: number): { commission: number; montantNet: number } {
    const commission = Math.round(montant * 0.005);
    const montantNet = montant - commission;
    return { commission, montantNet };
  },
};