import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'Zarani', required: false })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiProperty({ example: 'Kader', required: false })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'MonNouveauMotDePasse1', required: false, minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password?: string;

  @ApiProperty({ example: 'https://url-photo.com/photo.jpg', required: false })
  @IsOptional()
  @IsString()
  photoProfil?: string;
}