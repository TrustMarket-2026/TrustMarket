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
import { DeliveryRequestService } from './delivery-request.service';
import { CreateDeliveryRequestDto } from './dto/create-delivery-request.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('delivery-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delivery-requests')
export class DeliveryRequestController {
  constructor(private readonly deliveryRequestService: DeliveryRequestService) {}

  // POST /delivery-requests
  // Vendeur appuie sur "Trouver un livreur"
  @Post()
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Trouver un livreur partenaire',
    description:
      'Le vendeur demande un livreur partenaire après génération du QR Code. Tous les livreurs disponibles sont notifiés par push.',
  })
  @ApiResponse({
    status: 201,
    description: 'Demande créée — livreurs notifiés',
    schema: {
      example: {
        deliveryRequest: { id: '...', status: 'PENDING', statusLabel: "En attente d'un livreur" },
        livreursNotifies: 5,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Status transaction invalide (attendu: QR_GENERATED)' })
  @ApiResponse({ status: 403, description: 'Vous n\'êtes pas le vendeur de cette transaction' })
  @ApiResponse({ status: 409, description: 'Une demande est déjà en cours' })
  async createRequest(
    @Body() dto: CreateDeliveryRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.createRequest(user.userId, dto);
  }

  // GET /delivery-requests/:id
  @Get(':id')
  @ApiOperation({ summary: 'Voir le statut d\'une demande de livreur' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Détail de la demande' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  async getRequest(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.getRequest(id, user.userId);
  }

  // POST /delivery-requests/:id/accept
  @Post(':id/accept')
  @Roles(Role.LIVREUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une mission de livraison (LIVREUR uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Mission acceptée — Delivery créée' })
  @ApiResponse({ status: 400, description: 'La demande n\'est plus disponible' })
  async acceptRequest(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.acceptRequest(user.userId, id);
  }

  // POST /delivery-requests/:id/refuse
  @Post(':id/refuse')
  @Roles(Role.LIVREUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une mission de livraison (LIVREUR uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Refus enregistré' })
  async refuseRequest(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.refuseRequest(user.userId, id);
  }

  // POST /delivery-requests/:id/cancel
  @Post(':id/cancel')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une demande de livreur (VENDEUR uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande annulée' })
  @ApiResponse({ status: 400, description: 'Impossible d\'annuler (status != PENDING)' })
  async cancelRequest(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.cancelRequest(user.userId, id);
  }
}