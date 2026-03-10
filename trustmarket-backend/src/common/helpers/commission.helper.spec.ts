// ============================================================
//  Tests unitaires — Commission Helper
//  DEV 2 — Semaine 4
// ============================================================
import { commissionHelper } from './commission.helper';

describe('commissionHelper', () => {
  describe('calculate()', () => {
    it('doit calculer 0.5% de commission sur 10000 FCFA', () => {
      const result = commissionHelper.calculate(10000);
      expect(result.commission).toBe(50);
      expect(result.montantNet).toBe(9950);
    });

    it('doit calculer 0.5% de commission sur 100 FCFA (montant minimum)', () => {
      const result = commissionHelper.calculate(100);
      expect(result.commission).toBe(1); // Math.round(0.5) = 1
      expect(result.montantNet).toBe(99);
    });

    it('doit arrondir la commission à l\'entier le plus proche', () => {
      const result = commissionHelper.calculate(1001);
      // 1001 * 0.005 = 5.005 → arrondi à 5
      expect(result.commission).toBe(5);
      expect(result.montantNet).toBe(996);
    });

    it('commission + montantNet doit toujours égaler le montant initial', () => {
      const montants = [500, 1000, 5000, 25000, 100000];
      montants.forEach((montant) => {
        const result = commissionHelper.calculate(montant);
        expect(result.commission + result.montantNet).toBe(montant);
      });
    });
  });
});
