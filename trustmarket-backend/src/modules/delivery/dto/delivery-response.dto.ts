import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  transactionId: string;

  @ApiProperty({ example: 'Secteur 30, Avenue Kwame Nkrumah, Ouagadougou' })
  adresseLivraison: string;

  @ApiProperty({ example: 'ACCEPTED', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ description: 'Libellé lisible du statut' })
  statusLabel: string;

  @ApiProperty({ description: 'Montant de la transaction en FCFA' })
  montant: number;

  @ApiPropertyOptional({ description: 'Nom du vendeur' })
  vendeurNom?: string;

  @ApiProperty({
    description: "⚠️ Rappel important : C'est l'ACHETEUR qui scannera le QR Code à la livraison, pas le livreur.",
  })
  instructionScan: string;

  @ApiProperty()
  requestedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export function toDeliveryResponse(delivery: any): DeliveryResponseDto {
  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    ACCEPTED: 'Mission acceptée',
    IN_PROGRESS: 'En cours de livraison',
    COMPLETED: 'Livraison terminée',
    CANCELLED: 'Annulée',
  };

  return {
    id: delivery.id,
    transactionId: delivery.transactionId,
    adresseLivraison: delivery.adresseLivraison,
    status: delivery.status,
    statusLabel: statusLabels[delivery.status] ?? delivery.status,
    montant: delivery.transaction?.montant ?? 0,
    vendeurNom: delivery.transaction?.receiver
      ? `${delivery.transaction.receiver.prenom} ${delivery.transaction.receiver.nom}`
      : undefined,
    instructionScan: "L'acheteur scannnera le QR Code à la réception du colis pour libérer les fonds",
    requestedAt: delivery.requestedAt,
    completedAt: delivery.completedAt ?? undefined,
  };
}