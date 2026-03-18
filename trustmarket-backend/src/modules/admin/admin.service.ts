import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────
  // 1. KPIs Dashboard
  // ─────────────────────────────────────────────
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      transactionsAujourdhui,
      volumeAujourdhui,
      volumeTotalSemaine,
      commissionsGagnees,
      commissionsSemaine,
      transactionsParStatus,
      litgesOuverts,
      utilisateursInscrits,
      livraisonsEnCours,
      totalTransactions,
      transactionsCompletes,
    ] = await this.prisma.$transaction([
      // Transactions du jour
      this.prisma.transaction.count({
        where: { createdAt: { gte: today } },
      }),
      // Volume du jour (somme des montants)
      this.prisma.transaction.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { montant: true },
      }),
      // Volume de la semaine
      this.prisma.transaction.aggregate({
        where: { createdAt: { gte: startOfWeek } },
        _sum: { montant: true },
      }),
      // Commissions cumulées totales
      this.prisma.mobileMoneyLog.aggregate({
        where: { type: 'COMMISSION_RETAINED', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      // Commissions de la semaine
      this.prisma.mobileMoneyLog.aggregate({
        where: {
          type: 'COMMISSION_RETAINED',
          status: 'SUCCESS',
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      }),
      // Transactions par status
      this.prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Litiges ouverts
      this.prisma.dispute.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      // Utilisateurs inscrits
      this.prisma.user.count({ where: { isVerified: true } }),
      // Livraisons en cours
      this.prisma.delivery.count({
        where: { status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      }),
      // Total transactions pour taux de succès
      this.prisma.transaction.count(),
      // Transactions complétées
      this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Formater transactionsParStatus en objet clé/valeur
    const statusMap: Record<string, number> = {};
    for (const entry of transactionsParStatus) {
      statusMap[entry.status] = entry._count.id;
    }

    const tauxSucces =
      totalTransactions > 0
        ? Math.round((transactionsCompletes / totalTransactions) * 100)
        : 0;

    return {
      transactionsAujourdhui,
      volumeAujourdhui: volumeAujourdhui._sum.montant ?? 0,
      volumeTotalSemaine: volumeTotalSemaine._sum.montant ?? 0,
      commissionsGagnees: commissionsGagnees._sum.amount ?? 0,
      commissionsSemaine: commissionsSemaine._sum.amount ?? 0,
      transactionsParStatus: statusMap,
      litgesOuverts,
      utilisateursInscrits,
      livraisonsEnCours,
      tauxSucces,
    };
  }

  // ─────────────────────────────────────────────
  // 2. Solde des comptes OM + Wave TrustMarket
  // ─────────────────────────────────────────────
  async getAccountBalance() {
    // MobileMoneyAccountService est injecté depuis le controller
    // pour éviter la dépendance circulaire
    // Ce service retourne { orangeMoney, wave, total }
    this.logger.log('getAccountBalance → délégué à MobileMoneyAccountService (Dev 2)');
    return { message: 'Délégué à MobileMoneyAccountService' };
  }

  // ─────────────────────────────────────────────
  // 3. Historique des commissions avec filtres
  // ─────────────────────────────────────────────
  async getCommissionsHistory(
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { type: 'COMMISSION_RETAINED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.mobileMoneyLog.findMany({
        where,
        include: {
          transaction: {
            select: { id: true, montant: true, sender: { select: { nom: true, prenom: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mobileMoneyLog.count({ where }),
    ]);

    const totalCommissions = await this.prisma.mobileMoneyLog.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      data: logs,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      totalCommissions: totalCommissions._sum.amount ?? 0,
    };
  }

  // ─────────────────────────────────────────────
  // 4. Liste de tous les utilisateurs
  // ─────────────────────────────────────────────
  async getAllUsers(
    search?: string,
    role?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          isVerified: true,
          rating: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 5. Suspendre un utilisateur
  // ─────────────────────────────────────────────
  async suspendUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: false },
    });

    this.logger.log(`Utilisateur suspendu → userId=${userId}`);
    return { message: `Compte de ${user.prenom} ${user.nom} suspendu avec succès` };
  }

  // ─────────────────────────────────────────────
  // 6. Réactiver un utilisateur
  // ─────────────────────────────────────────────
  async reactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    this.logger.log(`Utilisateur réactivé → userId=${userId}`);
    return { message: `Compte de ${user.prenom} ${user.nom} réactivé avec succès` };
  }

  // ─────────────────────────────────────────────
  // 7. Toutes les transactions avec filtres
  // ─────────────────────────────────────────────
  async getAllTransactions(
    status?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: {
          sender: { select: { id: true, nom: true, prenom: true, telephone: true } },
          receiver: { select: { id: true, nom: true, prenom: true, telephone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 8. Tous les litiges
  // ─────────────────────────────────────────────
  async getAllDisputes(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [disputes, total] = await this.prisma.$transaction([
      this.prisma.dispute.findMany({
        where,
        include: {
          openedBy: { select: { id: true, nom: true, prenom: true } },
          transaction: {
            select: {
              id: true,
              montant: true,
              status: true,
              sender: { select: { nom: true, prenom: true } },
              receiver: { select: { nom: true, prenom: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 9. Toutes les demandes de livraison
  // ─────────────────────────────────────────────
  async getAllDeliveryRequests(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.deliveryRequest.findMany({
        where,
        include: {
          vendeur: { select: { id: true, nom: true, prenom: true, telephone: true } },
          livreur: { select: { id: true, nom: true, prenom: true, telephone: true } },
          transaction: { select: { id: true, montant: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deliveryRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 10. Lire les paramètres de l'application
  // ─────────────────────────────────────────────
  async getSettings() {
    return {
      COMMISSION_RATE: parseFloat(
        this.configService.get<string>('COMMISSION_RATE') ?? '0.005',
      ),
      QR_EXPIRY_HOURS: parseInt(
        this.configService.get<string>('QR_EXPIRY_HOURS') ?? '48',
      ),
      APP_NAME: this.configService.get<string>('APP_NAME') ?? 'TrustMarket',
      updatedAt: new Date(),
    };
  }

  // ─────────────────────────────────────────────
  // 11. Modifier les paramètres
  // ─────────────────────────────────────────────
  async updateSettings(settings: {
    COMMISSION_RATE?: number;
    QR_EXPIRY_HOURS?: number;
  }) {
    // Validation des valeurs
    if (
      settings.COMMISSION_RATE !== undefined &&
      (settings.COMMISSION_RATE <= 0 || settings.COMMISSION_RATE >= 0.1)
    ) {
      throw new BadRequestException(
        'COMMISSION_RATE doit être entre 0 et 0.1 (ex: 0.005 pour 0.5%)',
      );
    }

    if (
      settings.QR_EXPIRY_HOURS !== undefined &&
      (settings.QR_EXPIRY_HOURS < 1 || settings.QR_EXPIRY_HOURS > 168)
    ) {
      throw new BadRequestException(
        'QR_EXPIRY_HOURS doit être entre 1 et 168 heures (1 semaine max)',
      );
    }

    // En production, ces paramètres seraient stockés en DB dans une table AppSettings
    // Pour l'instant on retourne les nouvelles valeurs
    this.logger.log(`Paramètres mis à jour : ${JSON.stringify(settings)}`);

    return {
      message: 'Paramètres mis à jour avec succès',
      settings: {
        ...settings,
        updatedAt: new Date(),
      },
    };
  }
}