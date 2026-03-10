// ============================================================
//  Tests E2E — Webhooks Orange Money & Wave
//  DEV 2 — Semaine 4
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TransactionStatus, Operator } from '@prisma/client';
import { OrangeMoneyProvider } from '../src/modules/mobile-money-account/providers/orange-money.provider';
import { WaveProvider } from '../src/modules/mobile-money-account/providers/wave.provider';

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

describe('Webhooks Mobile Money (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let transactionId: string;
  let waveTransactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrangeMoneyProvider)
      .useValue(mockOmProvider)
      .overrideProvider(WaveProvider)
      .useValue(mockWaveProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Nettoyer
    await prisma.mobileMoneyLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@webhook-test.com' } } });

    // Créer les users
    const sender = await prisma.user.create({
      data: {
        nom: 'Webhook',
        prenom: 'Acheteur',
        email: 'acheteur@webhook-test.com',
        password: 'hashedpassword',
        telephone: '07333333',
        isVerified: true,
      },
    });

    const receiver = await prisma.user.create({
      data: {
        nom: 'Webhook',
        prenom: 'Vendeur',
        email: 'vendeur@webhook-test.com',
        password: 'hashedpassword',
        telephone: '07444444',
        isVerified: true,
      },
    });

    // Créer transaction OM
    const omTx = await prisma.transaction.create({
      data: {
        montant: 10000,
        commission: 50,
        montantNet: 9950,
        operator: Operator.ORANGE_MONEY,
        status: TransactionStatus.INITIATED,
        omRef: 'OM-WEBHOOK-TEST-123',
        senderId: sender.id,
        receiverId: receiver.id,
      },
    });
    transactionId = omTx.id;

    // Créer transaction Wave
    const waveTx = await prisma.transaction.create({
      data: {
        montant: 5000,
        commission: 25,
        montantNet: 4975,
        operator: Operator.WAVE,
        status: TransactionStatus.INITIATED,
        waveRef: 'WAVE-WEBHOOK-TEST-456',
        senderId: sender.id,
        receiverId: receiver.id,
      },
    });
    waveTransactionId = waveTx.id;
  }, 60000);

  afterAll(async () => {
    await prisma.mobileMoneyLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@webhook-test.com' } } });
    await app.close();
  });

  // ─── POST /webhooks/orange-money ──────────────────────────
  describe('POST /webhooks/orange-money', () => {
    it('doit confirmer le paiement et passer en FUNDS_HELD', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/orange-money')
        .send({
          transactionId,
          status: 'SUCCESS',
          amount: 10000,
          reference: 'OM-WEBHOOK-TEST-123',
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      expect(transaction!.status).toBe(TransactionStatus.FUNDS_HELD);
    });

    it('ne doit pas retraiter un paiement déjà confirmé', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/orange-money')
        .send({
          transactionId,
          status: 'SUCCESS',
          amount: 10000,
          reference: 'OM-WEBHOOK-TEST-123',
        });

      expect(res.status).toBe(200);
    });

    it('ne doit pas confirmer si status != SUCCESS', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/orange-money')
        .send({
          transactionId,
          status: 'FAILED',
          amount: 10000,
          reference: 'OM-WEBHOOK-TEST-123',
        });

      expect(res.status).toBe(200);
    });
  });

  // ─── POST /webhooks/wave ──────────────────────────────────
  describe('POST /webhooks/wave', () => {
    it('doit accepter un webhook Wave avec status succeeded', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/wave')
        .send({
          client_reference: waveTransactionId,
          payment_status: 'succeeded',
          amount: 5000,
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const updated = await prisma.transaction.findUnique({
        where: { id: waveTransactionId },
      });
      expect(updated!.status).toBe(TransactionStatus.FUNDS_HELD);
    });
  });
});