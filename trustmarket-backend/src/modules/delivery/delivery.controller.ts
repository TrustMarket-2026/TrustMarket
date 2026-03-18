import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { DeliveryRequestService } from './delivery-request/delivery-request.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryRequestService: DeliveryRequestService,
  ) {}

  // GET /deliveries — missions du livreur connecté
  @Get()
  @Roles(Role.LIVREUR)
  @ApiOperation({
    summary: 'Mes missions de livraison (LIVREUR uniquement)',
    description:
      "Liste toutes les missions du livreur connecté. Rappel : c'est l'ACHETEUR qui scanne le QR Code à la réception.",
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Liste paginée des missions' })
  async getMissions(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.deliveryService.getLivreurMissions(
      user.userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // GET /deliveries/stats — statistiques du livreur
  @Get('stats')
  @Roles(Role.LIVREUR)
  @ApiOperation({ summary: 'Statistiques du livreur (LIVREUR uniquement)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        totalMissions: 42,
        missionsCompletes: 38,
        missionsEnCours: 2,
        noteMoyenne: 4.7,
      },
    },
  })
  async getStats(@CurrentUser() user: { userId: string }) {
    return this.deliveryService.getLivreurStats(user.userId);
  }

  // GET /deliveries/:id — détail d'une mission
  @Get(':id')
  @Roles(Role.LIVREUR)
  @ApiOperation({ summary: "Détail d'une mission (LIVREUR uniquement)" })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Détail de la mission avec instructions' })
  @ApiResponse({ status: 403, description: 'Mission non assignée à ce livreur' })
  @ApiResponse({ status: 404, description: 'Mission introuvable' })
  async getMission(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryService.getMissionById(id, user.userId);
  }

  // POST /deliveries/:id/accept — accepter une mission
  @Post(':id/accept')
  @Roles(Role.LIVREUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une mission (LIVREUR uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la DeliveryRequest' })
  @ApiResponse({ status: 200, description: 'Mission acceptée' })
  async acceptMission(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    // Déléguer à DeliveryRequestService
    return this.deliveryRequestService.acceptRequest(user.userId, id);
  }

  // POST /deliveries/:id/refuse — refuser une mission
  @Post(':id/refuse')
  @Roles(Role.LIVREUR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une mission (LIVREUR uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la DeliveryRequest' })
  @ApiResponse({ status: 200, description: 'Refus enregistré' })
  async refuseMission(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryRequestService.refuseRequest(user.userId, id);
  }

  // PUT /deliveries/status — en ligne / hors ligne
  @Put('status')
  @Roles(Role.LIVREUR)
  @ApiOperation({
    summary: 'Changer sa disponibilité (LIVREUR uniquement)',
    description: 'En ligne = reçoit les notifications de nouvelles missions. Hors ligne = ne reçoit plus rien.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isOnline: { type: 'boolean', example: true },
      },
      required: ['isOnline'],
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Vous êtes maintenant en ligne. Vous recevrez les nouvelles missions.',
        isOnline: true,
      },
    },
  })
  async updateStatus(
    @Body('isOnline') isOnline: boolean,
    @CurrentUser() user: { userId: string },
  ) {
    return this.deliveryService.updateLivreurStatus(user.userId, isOnline);
  }
}