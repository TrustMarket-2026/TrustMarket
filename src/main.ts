import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Sécurité des headers HTTP ────────────────────────────
  app.use(helmet());

  // ── CORS — autorise le frontend Flutter/Web à appeler l'API ─
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Validation globale des DTOs ──────────────────────────
  // whitelist: true         → supprime les champs non déclarés dans le DTO
  // forbidNonWhitelisted    → retourne une erreur si champs inconnus
  // transform: true         → convertit automatiquement les types (string → number etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger — documentation automatique de l'API ────────
  // Accessible sur http://localhost:3000/api
  const config = new DocumentBuilder()
    .setTitle('TrustMarket API')
    .setDescription(
      'API backend de TrustMarket — Plateforme e-commerce sécurisée Burkina Faso. ' +
      'Système de séquestre Mobile Money avec QR Code.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entre ton Access Token JWT ici',
      },
      'access-token',
    )
    .addTag('auth', 'Inscription, connexion, OTP')
    .addTag('users', 'Profils utilisateurs')
    .addTag('transactions', 'Transactions sécurisées')
    .addTag('qrcode', 'Génération et scan QR Code')
    .addTag('deliveries', 'Missions livreur')
    .addTag('disputes', 'Litiges')
    .addTag('admin', 'Dashboard administrateur')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Garde le token entre les rechargements
    },
  });

  // ── Démarrage du serveur ─────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 TrustMarket API démarrée sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api`);
  logger.log(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();