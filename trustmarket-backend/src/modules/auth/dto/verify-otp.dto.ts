import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'kader@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '4821', description: 'Code OTP à 4 chiffres reçu par email' })
  @IsString()
  @Length(4, 4, { message: 'Le code OTP doit contenir exactement 4 chiffres' })
  code: string;
}