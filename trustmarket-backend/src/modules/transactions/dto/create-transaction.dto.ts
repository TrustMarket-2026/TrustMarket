// ============================================================
//  Create Transaction DTO
//  DEV 2 — Semaine 2
// ============================================================
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Numéro de téléphone du vendeur (receveur)',
    example: '07XXXXXXXX',
  })
  @IsString()
  receiverPhone: string;

  @ApiProperty({
    description: 'Montant de la transaction en FCFA (minimum 100)',
    example: 10000,
  })
  @IsNumber()
  @Min(100, { message: 'Le montant minimum est de 100 FCFA' })
  montant: number;

  @ApiPropertyOptional({
    description: 'Description optionnelle de la transaction',
    example: 'Achat téléphone Samsung',
  })
  @IsOptional()
  @IsString()
  description?: string;
}