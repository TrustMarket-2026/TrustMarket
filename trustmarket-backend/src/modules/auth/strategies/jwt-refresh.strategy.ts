import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true, // Pour récupérer le token brut
    });
  }

  async validate(req: Request, payload: { sub: string; email: string }) {
    // Récupère le refresh token brut depuis le header
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new UnauthorizedException();

    const refreshToken = authHeader.replace('Bearer', '').trim();
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}