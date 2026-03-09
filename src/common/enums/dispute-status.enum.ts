export enum DisputeStatus {
  OPEN              = 'OPEN',               // Litige ouvert
  IN_PROGRESS       = 'IN_PROGRESS',        // Admin en train de traiter
  RESOLVED_RELEASE  = 'RESOLVED_RELEASE',   // Admin a libéré les fonds au vendeur
  RESOLVED_REFUND   = 'RESOLVED_REFUND',    // Admin a remboursé l'acheteur
}