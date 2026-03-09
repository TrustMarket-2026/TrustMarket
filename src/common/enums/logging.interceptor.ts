// ============================================================
//  Logging Interceptor
//  Enregistre chaque requête : méthode, URL, durée, status
//  Utile pour déboguer et surveiller les performances
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          // Exemple de log : GET /transactions/history → 200 (45ms)
          this.logger.log(
            `${method} ${url} → ${response.statusCode} (${duration}ms)`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} → ERREUR (${duration}ms): ${error.message}`,
          );
        },
      }),
    );
  }
}