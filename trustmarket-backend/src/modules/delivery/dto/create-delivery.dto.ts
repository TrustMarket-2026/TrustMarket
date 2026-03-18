import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryRequestDto {
  @ApiProperty({
    description: 'UUID de la transaction (status doit être QR_GENERATED)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  transactionId: string;

  @ApiProperty({
    description: 'Adresse où le livreur doit collecter le colis (chez le vendeur)',
    example: 'Secteur 15, Rue 15.45, Ouagadougou',
  })
  @IsString()
  @MinLength(5)
  adresseCollecte: string;

  @ApiProperty({
    description: "Adresse de livraison (chez l'acheteur)",
    example: 'Secteur 30, Avenue Kwame Nkrumah, Ouagadougou',
  })
  @IsString()
  @MinLength(5)
  adresseLivraison: string;

  @ApiPropertyOptional({
    description: 'Instructions spéciales pour le livreur',
    example: 'Appeler avant de venir. Disponible après 17h.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;
}