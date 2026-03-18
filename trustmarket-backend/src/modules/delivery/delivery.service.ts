import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toDeliveryResponse } from './dto/delivery-response.dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // 1. Missions du livreur connecté (actives + historique)
  // ─────────────────────────────────────────────
  async getLivreurMissions(livreurId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [deliveries, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where: { livreurId },
        include: {
          transaction: {
            include: { receiver: true, sender: true },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.delivery.count({ where: { livreurId } }),
    ]);

    return {
      data: deliveries.map(toDeliveryResponse),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // 2. Détail d'une mission
  // ─────────────────────────────────────────────
  async getMissionById(deliveryId: string, livreurId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        transaction: {
          include: { receiver: true, sender: true },
        },
      },
    });

    if (!delivery) throw new NotFoundException('Mission introuvable');

    if (delivery.livreurId !== livreurId) {
      throw new ForbiddenException('Cette mission ne vous est pas assignée');
    }

    return toDeliveryResponse(delivery);
  }

  // ─────────────────────────────────────────────
  // 3. Changer la disponibilité du livreur (en ligne / hors ligne)
  // ─────────────────────────────────────────────
  async updateLivreurStatus(livreurId: string, isOnline: boolean) {
    this.logger.log(`updateLivreurStatus → livreurId=${livreurId}, isOnline=${isOnline}`);

    // On stocke la disponibilité via le fcmToken :
    // Si hors ligne, on vide le fcmToken pour ne plus recevoir les notifications de missions
    // En production, utiliser un champ dédié isOnline dans le modèle User
    await this.prisma.user.update({
      where: { id: livreurId },
      data: {
        // Si hors ligne, on efface le fcmToken pour qu'il ne reçoive plus de notifs missions
        // Si en ligne, le token sera remis à jour par l'app via PUT /users/me/fcm-token
        fcmToken: isOnline ? undefined : null,
      },
    });

    return {
      message: isOnline
        ? 'Vous êtes maintenant en ligne. Vous recevrez les nouvelles missions.'
        : 'Vous êtes hors ligne. Vous ne recevrez plus de missions.',
      isOnline,
    };
  }

  // ─────────────────────────────────────────────
  // 4. Statistiques du livreur
  // ─────────────────────────────────────────────
  async getLivreurStats(livreurId: string) {
    const [total, completed, inProgress, livreur] = await this.prisma.$transaction([
      this.prisma.delivery.count({ where: { livreurId } }),
      this.prisma.delivery.count({ where: { livreurId, status: 'COMPLETED' } }),
      this.prisma.delivery.count({
        where: { livreurId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      }),
      this.prisma.user.findUnique({
        where: { id: livreurId },
        select: { rating: true, nom: true, prenom: true },
      }),
    ]);

    return {
      totalMissions: total,
      missionsCompletes: completed,
      missionsEnCours: inProgress,
      missionAnnulees: total - completed - inProgress,
      noteMoyenne: livreur?.rating ?? 0,
      livreurNom: livreur ? `${livreur.prenom} ${livreur.nom}` : '',
    };
  }
}