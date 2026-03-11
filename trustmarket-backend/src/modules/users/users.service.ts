import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // RÉCUPÈRE MON PROFIL
  // ─────────────────────────────────────────
  async getMyProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        isVerified: true,
        
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user as UserResponseDto;
  }

  // ─────────────────────────────────────────
  // MET À JOUR MON PROFIL
  // ─────────────────────────────────────────
  async updateMyProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Vérifie que l'utilisateur existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Hash le nouveau mot de passe si fourni
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        isVerified: true,
        
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated as UserResponseDto;
  }

  // ─────────────────────────────────────────
  // RÉCUPÈRE UN UTILISATEUR PAR ID (ADMIN)
  // ─────────────────────────────────────────
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        isVerified: true,
        
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return user as UserResponseDto;
  }

  // ─────────────────────────────────────────
  // RÉCUPÈRE UN UTILISATEUR PAR TÉLÉPHONE
  // Utilisé par DEV 2 pour les transactions
  // ─────────────────────────────────────────
  async findByPhone(telephone: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { telephone },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        isVerified: true,
        
        createdAt: true,
        updatedAt: true,
      },
    });

    return user as UserResponseDto | null;
  }

  // ─────────────────────────────────────────
  // LISTE TOUS LES UTILISATEURS (ADMIN)
  // ─────────────────────────────────────────
  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          isVerified: true,
         
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────
  // SUPPRIME MON COMPTE
  // ─────────────────────────────────────────
  async deleteMyAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Compte supprimé avec succès' };
  }
}