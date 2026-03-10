import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Extrait le token du header : Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  // Cette méthode est appelée automatiquement après vérification du token
  async validate(payload: { sub: string; email: string; role: string }) {
const user = await (this.prisma as any).user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Accès refusé');
    }

    // L'objet retourné est disponible via @CurrentUser() dans les controllers
    return { userId: user.id, email: user.email, role: user.role };
  }
}