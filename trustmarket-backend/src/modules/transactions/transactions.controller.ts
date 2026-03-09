// ============================================================
//  Transactions Controller — 5 endpoints REST
//  DEV 2 — Semaine 2
// ============================================================
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // POST /transactions/create
  @Post('create')
  @ApiOperation({ summary: 'Initier une transaction sécurisée' })
  async create(@Request() req: any, @Body() dto: CreateTransactionDto) {
    const transaction = await this.transactionsService.createTransaction(
      req.user.id,
      dto,
    );
    return {
      message: 'Transaction créée avec succès',
      data: transaction,
      instructions:
        transaction.operator === 'ORANGE_MONEY'
          ? 'Ouvrez Orange Money et utilisez le lien pour effectuer le paiement'
          : 'Ouvrez Wave et utilisez le lien pour effectuer le paiement',
    };
  }

  // GET /transactions/history
  @Get('history')
  @ApiOperation({ summary: 'Historique des transactions de l\'utilisateur connecté' })
  async getHistory(@Request() req: any) {
    const transactions = await this.transactionsService.getHistory(req.user.id);
    return {
      message: 'Historique récupéré avec succès',
      count: transactions.length,
      data: transactions,
    };
  }

  // GET /transactions/:id
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une transaction' })
  async getById(@Param('id') id: string, @Request() req: any) {
    const transaction = await this.transactionsService.getById(id, req.user.id);
    return {
      message: 'Transaction récupérée avec succès',
      data: transaction,
    };
  }

  // GET /transactions/:id/status
  @Get(':id/status')
  @ApiOperation({ summary: 'Statut actuel d\'une transaction' })
  async getStatus(@Param('id') id: string, @Request() req: any) {
    const transaction = await this.transactionsService.getById(id, req.user.id);
    return {
      id: transaction.id,
      status: transaction.status,
      updatedAt: transaction.updatedAt,
    };
  }

  // GET /transactions/:id/deeplink
  @Get(':id/deeplink')
  @ApiOperation({ summary: 'Récupérer le deep link de paiement' })
  async getDeeplink(@Param('id') id: string, @Request() req: any) {
    const transaction = await this.transactionsService.getById(id, req.user.id);
    return {
      deepLink: transaction.deepLink,
      operator: transaction.operator,
      montant: transaction.montant,
    };
  }
}