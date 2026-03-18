import { IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({
    description: 'UUID de la transaction concernée',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  transactionId: string;

  @ApiProperty({
    description: 'Description du problème (minimum 20 caractères)',
    example: 'Le colis reçu ne correspond pas à ce qui a été commandé. Le vendeur a envoyé un article différent.',
    minLength: 20,
  })
  @IsString()
  @MinLength(20, { message: 'La description doit contenir au moins 20 caractères' })
  description: string;
}