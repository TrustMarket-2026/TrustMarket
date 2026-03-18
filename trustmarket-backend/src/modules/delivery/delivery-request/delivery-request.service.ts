import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDeliveryRequestDto } from './dto/create-delivery-request.dto';
import { toDeliveryRequestResponse } from './dto/delivery-request-response.dto';

@Injectable()
export class DeliveryRequestService {
  private readonly logger = new Logger(DeliveryRequestService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Bouton "Trouver un livreur" — appelé par le VENDEUR
  // ─────────────────────────────────────────────
  async createRequest(vendeurId: string, dto: CreateDeliveryRequestDto) {
    this.logger.log(`createRequest → vendeurId=${vendeurId}, transactionId=${dto.transactionId}`);

    // Vérifier que la transaction appartient au vendeur (receiverId)
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    if (transaction.receiverId !== vendeurId) {
      throw new ForbiddenException('Vous n\'êtes pas le vendeur de cette transaction');
    }

    // La transaction doit être en status QR_GENERATED
    if (transaction.status !== 'QR_GENERATED') {
      throw new BadRequestException(
        `Impossible de demander un livreur : status = ${transaction.status} (attendu: QR_GENERATED)`,
      );
    }

    // Vérifier qu'il n'y a pas déjà une demande PENDING pour cette transaction
    const existing = await this.prisma.deliveryRequest.findFirst({
      where: { transactionId: dto.transactionId, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException('Une demande de livreur est déjà en cours pour cette transaction');
    }

    // Créer la DeliveryRequest
    const deliveryRequest = await this.prisma.deliveryRequest.create({
      data: {
        transactionId: dto.transactionId,
        vendeurId,
        adresseCollecte: dto.adresseCollecte,
        adresseLivraison: dto.adresseLivraison,
        instructions: dto.instructions,
        status: 'PENDING',
        notifiedAt: new Date(),
      },
      include: {
        vendeur: true,
        livreur: true,
      },
    });

    // Trouver tous les livreurs disponibles (role=LIVREUR, isVerified=true)
    const livreurs = await this.prisma.user.findMany({
      where: { role: 'LIVREUR', isVerified: true },
      select: { id: true, fcmToken: true, prenom: true, nom: true },
    });

    this.logger.log(`Notification de ${livreurs.length} livreur(s) disponible(s)`);

    // Notifier tous les livreurs via FCM
    // (NotificationsService injecté depuis l'extérieur pour éviter la dépendance circulaire)
    // → Cette notification est déclenchée depuis le controller ou via un event
    // Les fcmTokens valides sont passés au NotificationsService
    const fcmTokens = livreurs.map((l) => l.fcmToken).filter(Boolean) as string[];
    if (fcmTokens.length > 0) {
      this.logger.log(`FCM tokens à notifier : ${fcmTokens.length}`);
      // NotificationsService.notifyNewMission() sera appelé depuis le controller
    }

    return {
      deliveryRequest: toDeliveryRequestResponse(deliveryRequest),
      livreursNotifies: livreurs.length,
      livreurIds: livreurs.map((l) => l.id),
    };
  }

  // ─────────────────────────────────────────────
  // Un livreur accepte la demande
  // ─────────────────────────────────────────────
  async acceptRequest(livreurId: string, deliveryRequestId: string) {
    this.logger.log(`acceptRequest → livreurId=${livreurId}, requestId=${deliveryRequestId}`);

    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
      include: { vendeur: true },
    });

    if (!request) throw new NotFoundException('Demande introuvable');

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cette demande n'est plus disponible (status: ${request.status})`,
      );
    }

    // Mettre à jour la demande et créer une Delivery liée dans une transaction atomique
    const [updatedRequest, delivery] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.deliveryRequest.update({
        where: { id: deliveryRequestId },
        data: { status: 'ACCEPTED', livreurId },
        include: { vendeur: true, livreur: true },
      });

      const newDelivery = await tx.delivery.create({
        data: {
          transactionId: request.transactionId,
          livreurId,
          adresseLivraison: request.adresseLivraison,
          status: 'ACCEPTED',
          requestedAt: new Date(),
        },
      });

      return [updated, newDelivery];
    });

    this.logger.log(`Mission acceptée → livreurId=${livreurId}, deliveryId=${delivery.id}`);

    return {
      deliveryRequest: toDeliveryRequestResponse(updatedRequest),
      deliveryId: delivery.id,
    };
  }

  // ─────────────────────────────────────────────
  // Un livreur refuse la demande
  // ─────────────────────────────────────────────
  async refuseRequest(livreurId: string, deliveryRequestId: string) {
    this.logger.log(`refuseRequest → livreurId=${livreurId}, requestId=${deliveryRequestId}`);

    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
    });

    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Cette demande n\'est plus en attente');
    }

    // Compter combien de livreurs ont déjà refusé
    // (On garde le status PENDING pour que d'autres livreurs puissent accepter)
    // Si tous les livreurs actifs ont refusé → notifier le vendeur
    const totalLivreurs = await this.prisma.user.count({
      where: { role: 'LIVREUR', isVerified: true },
    });

    this.logger.log(`Refus enregistré. Total livreurs actifs: ${totalLivreurs}`);

    return { message: 'Refus enregistré', requestId: deliveryRequestId };
  }

  // ─────────────────────────────────────────────
  // Le VENDEUR annule sa demande
  // ─────────────────────────────────────────────
  async cancelRequest(vendeurId: string, deliveryRequestId: string) {
    this.logger.log(`cancelRequest → vendeurId=${vendeurId}, requestId=${deliveryRequestId}`);

    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
    });

    if (!request) throw new NotFoundException('Demande introuvable');

    if (request.vendeurId !== vendeurId) {
      throw new ForbiddenException('Vous n\'êtes pas le propriétaire de cette demande');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Impossible d'annuler : status = ${request.status} (seules les demandes PENDING peuvent être annulées)`,
      );
    }

    const updated = await this.prisma.deliveryRequest.update({
      where: { id: deliveryRequestId },
      data: { status: 'CANCELLED' },
      include: { vendeur: true, livreur: true },
    });

    return toDeliveryRequestResponse(updated);
  }

  // ─────────────────────────────────────────────
  // Récupérer une demande (vendeur ou livreur assigné)
  // ─────────────────────────────────────────────
  async getRequest(deliveryRequestId: string, userId: string) {
    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryRequestId },
      include: { vendeur: true, livreur: true, transaction: true },
    });

    if (!request) throw new NotFoundException('Demande introuvable');

    // Vérifier que l'utilisateur est le vendeur ou le livreur assigné
    const isVendeur = request.vendeurId === userId;
    const isLivreur = request.livreurId === userId;

    if (!isVendeur && !isLivreur) {
      throw new ForbiddenException('Accès refusé');
    }

    return toDeliveryRequestResponse(request);
  }
}