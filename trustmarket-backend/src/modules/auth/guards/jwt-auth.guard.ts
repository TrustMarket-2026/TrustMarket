import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Ce guard protège les endpoints — l'utilisateur doit être connecté
// Utilisation : @UseGuards(JwtAuthGuard) sur un controller ou endpoint
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}