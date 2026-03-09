export enum DeliveryRequestStatus {
  PENDING   = 'PENDING',    // En attente d'un livreur
  ACCEPTED  = 'ACCEPTED',   // Un livreur a accepté
  REFUSED   = 'REFUSED',    // Livreur a refusé
  CANCELLED = 'CANCELLED',  // Vendeur a annulé
}