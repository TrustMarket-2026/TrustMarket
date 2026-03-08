export enum TransactionStatus {
  INITIATED  = 'INITIATED',    // Transaction créée, attente paiement
  FUNDS_HELD = 'FUNDS_HELD',   // Argent reçu sur compte TrustMarket
  QR_GENERATED = 'QR_GENERATED', // QR Code créé, envoyé au vendeur
  DELIVERED  = 'DELIVERED',    // QR scanné par l'acheteur
  COMPLETED  = 'COMPLETED',    // Argent viré au vendeur
  REFUNDED   = 'REFUNDED',     // Acheteur remboursé
  DISPUTED   = 'DISPUTED',     // Litige ouvert, fonds gelés
}