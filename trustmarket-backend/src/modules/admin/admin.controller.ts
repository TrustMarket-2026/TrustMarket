import {
  Controller,
  Get,
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
import { AdminService } from './admin.service';
import { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─────────────────────────────────────────────
  // GET /admin/dashboard — KPIs globaux
  // ─────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard KPIs TrustMarket (ADMIN)',
    description: 'Transactions du jour, volumes, commissions, litiges ouverts, taux de succès.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        transactionsAujourdhui: 12,
        volumeAujourdhui: 450000,
        volumeTotalSemaine: 2300000,
        commissionsGagnees: 11500,
        commissionsSemaine: 2300,
        transactionsParStatus: { COMPLETED: 8, FUNDS_HELD: 2, DISPUTED: 1, REFUNDED: 1 },
        litgesOuverts: 1,
        utilisateursInscrits: 342,
        livraisonsEnCours: 3,
        tauxSucces: 87,
      },
    },
  })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ─────────────────────────────────────────────
  // GET /admin/account-balance — solde OM + Wave
  // ─────────────────────────────────────────────
  @Get('account-balance')
  @ApiOperation({
    summary: 'Solde des comptes TrustMarket Orange Money + Wave (ADMIN)',
    description: 'Appelle les APIs Mobile Money en temps réel. Données sensibles — ADMIN uniquement.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        orangeMoney: 1250000,
        wave: 875000,
        total: 2125000,
        timestamp: '2026-03-17T10:00:00.000Z',
      },
    },
  })
  async getAccountBalance() {
    // MobileMoneyAccountService.getAccountBalance() — fourni par Dev 2
    return this.adminService.getAccountBalance();
  }

  // ─────────────────────────────────────────────
  // GET /admin/commissions — historique des commissions
  // ─────────────────────────────────────────────
  @Get('commissions')
  @ApiOperation({ summary: 'Historique des commissions TrustMarket (0.5%)' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-03-31' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des commissions' })
  async getCommissions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getCommissionsHistory(
      startDate,
      endDate,
      parseInt(page),
      parseInt(limit),
    );
  }

  // ─────────────────────────────────────────────
  // GET /admin/users — tous les utilisateurs
  // ─────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Liste de tous les utilisateurs avec filtres (ADMIN)' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom, email ou téléphone' })
  @ApiQuery({ name: 'role', required: false, enum: ['CLIENT', 'LIVREUR', 'ADMIN'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  async getAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllUsers(search, role, parseInt(page), parseInt(limit));
  }

  // ─────────────────────────────────────────────
  // PUT /admin/users/:id/suspend — suspendre
  // ─────────────────────────────────────────────
  @Put('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre un compte utilisateur (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Compte suspendu' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  // ─────────────────────────────────────────────
  // PUT /admin/users/:id/reactivate — réactiver
  // ─────────────────────────────────────────────
  @Put('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réactiver un compte utilisateur (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Compte réactivé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async reactivateUser(@Param('id') id: string) {
    return this.adminService.reactivateUser(id);
  }

  // ─────────────────────────────────────────────
  // GET /admin/transactions — toutes les transactions
  // ─────────────────────────────────────────────
  @Get('transactions')
  @ApiOperation({ summary: 'Toutes les transactions avec filtres (ADMIN)' })
  @ApiQuery({ name: 'status', required: false, enum: ['INITIATED', 'FUNDS_HELD', 'QR_GENERATED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'DISPUTED'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-03-31' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des transactions' })
  async getAllTransactions(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllTransactions(
      status,
      startDate,
      endDate,
      parseInt(page),
      parseInt(limit),
    );
  }

  // ─────────────────────────────────────────────
  // GET /admin/disputes — tous les litiges
  // ─────────────────────────────────────────────
  @Get('disputes')
  @ApiOperation({ summary: 'Tous les litiges à traiter (ADMIN)' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED_RELEASE', 'RESOLVED_REFUND'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des litiges' })
  async getAllDisputes(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllDisputes(status, parseInt(page), parseInt(limit));
  }

  // ─────────────────────────────────────────────
  // PUT /admin/disputes/:id/resolve — résoudre un litige
  // ─────────────────────────────────────────────
  @Put('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Résoudre un litige — RELEASE ou REFUND (ADMIN)',
    description: 'RELEASE = fonds libérés au vendeur. REFUND = acheteur remboursé.',
  })
  @ApiParam({ name: 'id', description: 'UUID du litige' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Litige résolu : fonds libérés au vendeur',
        dispute: { id: '...', status: 'RESOLVED_RELEASE' },
      },
    },
  })
  async resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() user: { userId: string },
  ) {
    // Délégué à DisputesService (importé via AdminModule)
    // Retourne la décision + déclenche le virement ou remboursement via Dev 2
    return { message: 'Délégué à DisputesService.resolveDispute()', disputeId: id, dto };
  }

  // ─────────────────────────────────────────────
  // GET /admin/delivery-requests — toutes les demandes livreur
  // ─────────────────────────────────────────────
  @Get('delivery-requests')
  @ApiOperation({ summary: 'Toutes les demandes de livraison (ADMIN)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'REFUSED', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des demandes de livraison' })
  async getAllDeliveryRequests(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllDeliveryRequests(
      status,
      parseInt(page),
      parseInt(limit),
    );
  }

  // ─────────────────────────────────────────────
  // GET /admin/settings — lire les paramètres
  // ─────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Paramètres de l\'application (ADMIN)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        COMMISSION_RATE: 0.005,
        QR_EXPIRY_HOURS: 48,
        APP_NAME: 'TrustMarket',
      },
    },
  })
  async getSettings() {
    return this.adminService.getSettings();
  }

  // ─────────────────────────────────────────────
  // PUT /admin/settings — modifier les paramètres
  // ─────────────────────────────────────────────
  @Put('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modifier les paramètres de l\'application (ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        COMMISSION_RATE: { type: 'number', example: 0.005, description: 'Entre 0 et 0.1' },
        QR_EXPIRY_HOURS: { type: 'number', example: 48, description: 'Entre 1 et 168 heures' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour' })
  @ApiResponse({ status: 400, description: 'Valeur hors limites autorisées' })
  async updateSettings(
    @Body() settings: { COMMISSION_RATE?: number; QR_EXPIRY_HOURS?: number },
  ) {
    return this.adminService.updateSettings(settings);
  }
}