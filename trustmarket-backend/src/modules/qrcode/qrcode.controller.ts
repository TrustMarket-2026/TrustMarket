import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QrcodeService } from './qrcode.service';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('qrcode')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qrcode')
export class QrcodeController {
  constructor(private readonly qrcodeService: QrcodeService) {}

  // ─────────────────────────────────────────────
  // POST /qrcode/generate
  // Appelé après confirmation du paiement (FUNDS_HELD)
  // ─────────────────────────────────────────────
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Générer le QR Code après confirmation du paiement',
    description:
      'Génère un QR Code signé HMAC-SHA256 pour une transaction en status FUNDS_HELD. Envoie automatiquement le QR au VENDEUR par push + email.',
  })
  @ApiResponse({
    status: 201,
    description: 'QR Code généré et envoyé au vendeur',
    schema: {
      example: {
        message: 'QR Code envoyé au vendeur',
        transactionId: 'a1b2c3d4-...',
        expiresAt: '2026-03-19T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Status de la transaction invalide (attendu: FUNDS_HELD)' })
  @ApiResponse({ status: 404, description: 'Transaction introuvable' })
  async generateQR(@Body() dto: GenerateQrDto) {
    const { transactionId } = dto;
    const result = await this.qrcodeService.generateQR(transactionId);
    return {
      message: 'QR Code envoyé au vendeur',
      transactionId,
      expiresAt: result.expiresAt,
    };
  }

  // ─────────────────────────────────────────────
  // POST /qrcode/scan
  // Appelé par l'ACHETEUR à la réception du colis
  // ─────────────────────────────────────────────
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Scanner le QR Code à la réception du colis (ACHETEUR uniquement)",
    description:
      "L'acheteur scanne le QR Code pour confirmer la réception et libérer les fonds au vendeur. Cette action est irréversible.",
  })
  @ApiResponse({
    status: 200,
    description: 'Scan validé — fonds libérés au vendeur',
    schema: {
      example: {
        success: true,
        message: 'Réception confirmée - Fonds libérés au vendeur 🎉',
        transaction: {
          id: 'a1b2c3d4-...',
          status: 'DELIVERED',
          montant: 10000,
          montantNet: 9950,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'QR Code invalide ou introuvable' })
  @ApiResponse({ status: 409, description: 'QR Code déjà utilisé' })
  @ApiResponse({ status: 400, description: 'QR Code expiré après 48h' })
  @ApiResponse({ status: 403, description: "Seul l'acheteur peut scanner ce QR Code" })
  async scanQR(
    @Body() dto: ScanQrDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.qrcodeService.validateScan(dto.token, user.userId);
    return {
      success: result.success,
      message: 'Réception confirmée - Fonds libérés au vendeur 🎉',
      transaction: {
        id: result.transaction.id,
        status: result.transaction.status,
        montant: result.transaction.montant,
        montantNet: result.transaction.montantNet,
        commission: result.transaction.commission,
      },
    };
  }

  // ─────────────────────────────────────────────
  // GET /qrcode/:transactionId
  // Récupération du QR Code — VENDEUR uniquement
  // ─────────────────────────────────────────────
  @Get(':transactionId')
  @ApiOperation({
    summary: "Récupérer le QR Code d'une transaction (VENDEUR uniquement)",
    description:
      'Retourne l\'image QR Code en base64 avec le temps restant avant expiration. Accessible uniquement par le vendeur (receiverId) de la transaction.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'UUID de la transaction',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'QR Code trouvé',
    schema: {
      example: {
        qrImageBase64: 'iVBORw0KGgoAAAANSUhEUgAA...',
        expiresAt: '2026-03-19T10:00:00.000Z',
        isUsed: false,
        timeRemaining: '23h 45min restantes',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction ou QR Code introuvable' })
  @ApiResponse({ status: 403, description: "Accès refusé : vous n'êtes pas le vendeur" })
  async getQRCode(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.qrcodeService.getQRCodeForTransaction(transactionId, user.userId);
  }
}