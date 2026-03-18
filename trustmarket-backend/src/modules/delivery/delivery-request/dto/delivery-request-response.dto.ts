import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryRequestResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  transactionId: string;

  @ApiProperty({ example: 'Secteur 15, Rue 15.45, Ouagadougou' })
  adresseCollecte: string;

  @ApiProperty({ example: 'Secteur 30, Avenue Kwame Nkrumah, Ouagadougou' })
  adresseLivraison: string;

  @ApiPropertyOptional({ example: 'Appeler avant de venir' })
  instructions?: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'ACCEPTED', 'REFUSED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ description: 'Libellé lisible du statut en français' })
  statusLabel: string;

  @ApiPropertyOptional({ example: 'Koné Mamadou' })
  livreurNom?: string;

  @ApiProperty({ example: 'Traoré Issa' })
  vendeurNom: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export function toDeliveryRequestResponse(req: any): DeliveryRequestResponseDto {
  const statusLabels: Record<string, string> = {
    PENDING: 'En attente d\'un livreur',
    ACCEPTED: 'Livreur assigné',
    REFUSED: 'Refusé',
    CANCELLED: 'Annulé',
  };

  return {
    id: req.id,
    transactionId: req.transactionId,
    adresseCollecte: req.adresseCollecte,
    adresseLivraison: req.adresseLivraison,
    instructions: req.instructions,
    status: req.status,
    statusLabel: statusLabels[req.status] ?? req.status,
    livreurNom: req.livreur ? `${req.livreur.prenom} ${req.livreur.nom}` : undefined,
    vendeurNom: req.vendeur ? `${req.vendeur.prenom} ${req.vendeur.nom}` : '',
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}