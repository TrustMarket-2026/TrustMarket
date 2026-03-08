// ============================================================
//  Mobile Money Interface — Contrat commun OM + Wave
//  DEV 2 — Semaine 1
// ============================================================

export interface PaymentResult {
  success: boolean;
  transactionRef: string;
  message: string;
}

export interface PaymentStatus {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  ref: string;
}

export interface TransferResult {
  success: boolean;
  ref: string;
  message: string;
}

export interface IMobileMoneyProvider {
  /**
   * Vérifie le statut d'un paiement entrant
   */
  checkPaymentStatus(ref: string): Promise<PaymentStatus>;

  /**
   * Envoie de l'argent vers un numéro (vendeur ou acheteur)
   */
  sendMoney(to: string, amount: number, ref: string): Promise<TransferResult>;

  /**
   * Retourne le solde du compte TrustMarket
   */
  getBalance(): Promise<number>;
}

