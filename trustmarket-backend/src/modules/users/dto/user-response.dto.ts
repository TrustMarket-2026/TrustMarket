import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

// Ce DTO définit ce qu'on retourne au client — jamais le mot de passe !
export class UserResponseDto {
  @ApiProperty({ example: 'uuid-xxxx' })
  id: string;

  @ApiProperty({ example: 'Zarani' })
  nom: string;

  @ApiProperty({ example: 'Kader' })
  prenom: string;

  @ApiProperty({ example: 'kader@email.com' })
  email: string;

  @ApiProperty({ example: '+22670123456' })
  telephone: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ example: true })
  isVerified: boolean;


  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}