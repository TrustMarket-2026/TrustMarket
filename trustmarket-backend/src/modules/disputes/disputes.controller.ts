import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  // ─────────────────────────────────────────────
  // POST /disputes — ouvrir un litige
  // ─────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ouvrir un litige sur une transaction',
    description:
      'Acheteur ou vendeur peut ouvrir un litige. Gèle immédiatement les fonds et annule tous les jobs automatiques (autoRefund, releaseFunds).',
  })
  @ApiResponse({
    status: 201,
    description: 'Litige ouvert — fonds gelés — admin notifié',
    schema: {
      example: {
        id: 'dispute-uuid',
        transactionId: 'transaction-uuid',
        status: 'OPEN',
        description: 'Le colis reçu ne correspond pas...',
        createdAt: '2026-03-17T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Status transaction incompatible avec un litige' })
  @ApiResponse({ status: 403, description: 'Vous n\'êtes pas impliqué dans cette transaction' })
  @ApiResponse({ status: 409, description: 'Un litige est déjà ouvert pour cette transaction' })
  async openDispute(
    @Body() dto: CreateDisputeDto,
    @CurrentUser() user: { userId: string },
  ) {
    const dispute = await this.disputesService.openDispute(user.userId, dto);
    return {
      message: 'Litige ouvert. Les fonds sont gelés en attendant la décision de l\'admin.',
      dispute,
    };
  }

  // ─────────────────────────────────────────────
  // GET /disputes — mes litiges
  // ─────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Mes litiges (acheteur ou vendeur)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Liste paginée des litiges' })
  async getDisputes(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.disputesService.getDisputes(
      user.userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // ─────────────────────────────────────────────
  // GET /disputes/:id — détail d'un litige
  // ─────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un litige' })
  @ApiParam({ name: 'id', description: 'UUID du litige' })
  @ApiResponse({ status: 200, description: 'Détail complet du litige avec preuves' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Litige introuvable' })
  async getDisputeById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.disputesService.getDisputeById(id, user.userId);
  }

  // ─────────────────────────────────────────────
  // POST /disputes/:id/evidence — upload preuve R2
  // ─────────────────────────────────────────────
  @Post(':id/evidence')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Ajouter une preuve (photo ou PDF) — max 5MB',
    description: 'Upload vers Cloudflare R2. Formats acceptés : JPG, PNG, WEBP, PDF.',
  })
  @ApiParam({ name: 'id', description: 'UUID du litige' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier preuve (image ou PDF, max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Preuve uploadée sur Cloudflare R2',
    schema: {
      example: {
        message: 'Preuve ajoutée avec succès',
        url: 'https://pub.r2.dev/disputes/dispute-id/user-id/1234-photo.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Format invalide ou fichier trop volumineux (max 5MB)' })
  @ApiResponse({ status: 403, description: 'Vous n\'êtes pas impliqué dans ce litige' })
  async addEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) {
      throw new Error('Aucun fichier reçu');
    }
    const result = await this.disputesService.addEvidence(id, user.userId, file);
    return {
      message: 'Preuve ajoutée avec succès',
      url: result.url,
    };
  }

  // ─────────────────────────────────────────────
  // PUT /disputes/:id/resolve — résoudre (ADMIN)
  // ─────────────────────────────────────────────
  @Put(':id/resolve')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Résoudre un litige — RELEASE ou REFUND (ADMIN uniquement)',
    description:
      'RELEASE = libérer les fonds au vendeur. REFUND = rembourser l\'acheteur. La justification est transmise aux deux parties.',
  })
  @ApiParam({ name: 'id', description: 'UUID du litige' })
  @ApiResponse({
    status: 200,
    description: 'Litige résolu — opération financière déclenchée',
    schema: {
      example: {
        message: 'Litige résolu : fonds libérés au vendeur',
        dispute: { id: '...', status: 'RESOLVED_RELEASE', decision: '...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Litige déjà résolu' })
  @ApiResponse({ status: 403, description: 'Accès réservé aux admins' })
  async resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.disputesService.resolveDispute(id, user.userId, dto);

    const message =
      result.decision === 'RELEASE'
        ? 'Litige résolu : fonds libérés au vendeur'
        : 'Litige résolu : acheteur remboursé';

    return { message, dispute: result.dispute };
  }
}