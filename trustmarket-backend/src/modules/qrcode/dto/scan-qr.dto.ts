import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanQrDto {
  @ApiProperty({
    description: 'Token HMAC-SHA256 contenu dans le QR Code',
    example: 'eyJ0b2tlbiI6Ii4uLiJ9...',
  })
  @IsString()
  token: string;
}