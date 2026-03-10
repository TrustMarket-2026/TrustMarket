import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '07XXXXXXXX ou kader@email.com',
    description: 'Numéro de téléphone OU adresse email',
  })
  @IsString()
  emailOrPhone: string;

  @ApiProperty({ example: 'MonMotDePasse1' })
  @IsString()
  password: string;
}