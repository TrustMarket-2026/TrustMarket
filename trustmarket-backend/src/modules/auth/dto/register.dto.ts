import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Kader', description: 'Nom de famille' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Zarani', description: 'Prénom' })
  @IsString()
  prenom: string;

  @ApiProperty({ example: 'kader@email.com' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;

  @ApiProperty({ example: 'MonMotDePasse1', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @ApiProperty({ example: '07XXXXXXXX', description: 'Numéro de téléphone burkinabè' })
  @IsString()
  telephone: string;

  @ApiProperty({ enum: Role, default: Role.CLIENT, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}