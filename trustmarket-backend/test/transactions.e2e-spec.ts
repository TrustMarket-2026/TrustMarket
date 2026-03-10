// ============================================================
//  Tests E2E — Transactions endpoints
//  DEV 2 — Semaine 4
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OrangeMoneyProvider } from '../src/modules/mobile-money-account/providers/orange-money.provider';
import { WaveProvider } from '../src/modules/mobile-money-account/providers/wave.provider';

// ─── Mock JwtAuthGuard : bypass auth pour les tests ─────────
const mockJwtAuthGuard = { canActivate: () => true };

// ─── Mock Providers : pas d'appels API réels ────────────────
const mockOmProvider = {
  checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'SUCCESS', amount: 10000, ref: 'OM-TEST' }),
  sendMoney: jest.fn().mockResolvedValue({ success: true, ref: 'MOCK-OM', message: 'OK' }),
  getBalance: jest.fn().mockResolvedValue(500000),
};

const mockWaveProvider = {
  checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'SUCCESS', amount: 5000, ref: 'WAVE-TEST' }),
  sendMoney: jest.fn().mockResolvedValue({ success: true, ref: 'MOCK-WAVE', message: 'OK' }),
  getBalance: jest.fn().mockResolvedValue(300000),
};

describe('Transactions (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let senderId: string;
  let transactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideProvider(OrangeMoneyProvider)
      .useValue(mockOmProvider)
      .overrideProvider(WaveProvider)
      .useValue(mockWaveProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Nettoyer la base de test
    await prisma.mobileMoneyLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@test-e2e.com' } } });

    // Créer les users directement en base (pas besoin d'OTP)
    const sender = await prisma.user.create({
      data: {
        nom: 'Test',
        prenom: 'Acheteur',
        email: 'acheteur@test-e2e.com',
        password: 'hashedpassword',
        telephone: '07111111',
        isVerified: true,
      },
    });
    senderId = sender.id;

    await prisma.user.create({
      data: {
        nom: 'Test',
        prenom: 'Vendeur',
        email: 'vendeur@test-e2e.com',
        password: 'hashedpassword',
        telephone: '07222222',
        isVerified: true,
      },
    });
  }, 60000);

  afterAll(async () => {
    await prisma.mobileMoneyLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@test-e2e.com' } } });
    await app.close();
  });

  // ─── Simuler l'utilisateur connecté ─────────────────────────
  // Le guard est bypassé mais req.user doit exister
  // On surcharge via un middleware de test
  beforeEach(() => {
    // Le mockJwtAuthGuard retourne true mais req.user est undefined
    // On patch directement via jest
    mockJwtAuthGuard.canActivate = jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: senderId };
      return true;
    });
  });

  // ─── POST /transactions/create ────────────────────────────
  describe('POST /transactions/create', () => {
    it('doit créer une transaction et retourner un deep link OM', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/create')
        .send({
          receiverPhone: '07222222',
          montant: 10000,
          description: 'Achat test E2E',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.deepLink).toContain('omw://transfer');
      expect(res.body.data.commission).toBe(50);
      expect(res.body.data.montantNet).toBe(9950);

      transactionId = res.body.data.id;
    });

    it('doit rejeter si le montant est inférieur à 100 FCFA', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/create')
        .send({
          receiverPhone: '07222222',
          montant: 50,
        });

      expect(res.status).toBe(400);
    });

    it('doit rejeter si le receveur n\'existe pas', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/create')
        .send({
          receiverPhone: '07999999',
          montant: 5000,
        });

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /transactions/history ────────────────────────────
  describe('GET /transactions/history', () => {
    it('doit retourner l\'historique des transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/history');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── GET /transactions/:id ────────────────────────────────
  describe('GET /transactions/:id', () => {
    it('doit retourner le détail d\'une transaction', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(transactionId);
      expect(res.body.data.montant).toBe(10000);
    });

    it('doit retourner 404 pour une transaction inexistante', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /transactions/:id/status ─────────────────────────
  describe('GET /transactions/:id/status', () => {
    it('doit retourner le statut INITIATED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/status`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INITIATED');
    });
  });

  // ─── GET /transactions/:id/deeplink ───────────────────────
  describe('GET /transactions/:id/deeplink', () => {
    it('doit retourner le deep link OM', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/deeplink`);

      expect(res.status).toBe(200);
      expect(res.body.deepLink).toContain('omw://transfer');
      expect(res.body.operator).toBe('ORANGE_MONEY');
    });
  });
});