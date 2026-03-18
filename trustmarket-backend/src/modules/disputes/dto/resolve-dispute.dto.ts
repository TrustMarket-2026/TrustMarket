import { IsString, IsIn, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Décision de l\'admin : RELEASE = libérer les fonds au vendeur, REFUND = rembourser l\'acheteur',
    enum: ['RELEASE', 'REFUND'],
    example: 'RELEASE',
  })
  @IsString()
  @IsIn(['RELEASE', 'REFUND'], { message: 'La décision doit être RELEASE ou REFUND' })
  decision: 'RELEASE' | 'REFUND';

  @ApiProperty({
    description: 'Justification obligatoire de la décision (visible par les deux parties)',
    example: 'Après examen des preuves fournies, le vendeur a bien livré le produit conforme. Les fonds sont libérés.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'La justification doit contenir au moins 10 caractères' })
  justification: string;
}