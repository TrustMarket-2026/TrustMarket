// ============================================================
//  Tests unitaires — TransactionsService
//  DEV 2 — Semaine 4
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { MobileMoneyAccountService } from '../mobile-money-account/mobile-money-account.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionStatus, Operator } from '@prisma/client';

// ─── Mocks ──────────────────────────────────────────────────
const mockPrisma = {
  user: { findUnique: jest.fn() },
  transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockMobileMoneyService = {
  receiveDeposit: jest.fn(),
  releaseFunds: jest.fn(),
  refundBuyer: jest.fn(),
};

// ─── Setup ──────────────────────────────────────────────────
describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MobileMoneyAccountService, useValue: mockMobileMoneyService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  // ─── createTransaction() ───────────────────────────────────
  describe('createTransaction()', () => {
    it('doit créer une transaction OM avec le bon deep link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'receiver-001',
        nom: 'Traoré',
        prenom: 'Moussa',
        telephone: '07XXXXXXXX',
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-001',
        montant: 10000,
        commission: 50,
        montantNet: 9950,
        operator: Operator.ORANGE_MONEY,
        status: TransactionStatus.INITIATED,
        description: 'Achat téléphone',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: { nom: 'Ouédraogo', prenom: 'Jean' },
        receiver: { nom: 'Traoré', prenom: 'Moussa', telephone: '07XXXXXXXX' },
      });

      const result = await service.createTransaction('sender-001', {
        receiverPhone: '07XXXXXXXX',
        montant: 10000,
        description: 'Achat téléphone',
      });

      expect(result.commission).toBe(50);
      expect(result.montantNet).toBe(9950);
      expect(result.deepLink).toContain('omw://transfer');
      expect(result.deepLink).toContain('10000');
    });

    it('doit créer une transaction Wave avec le bon deep link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'receiver-002',
        nom: 'Sawadogo',
        prenom: 'Ali',
        telephone: '01XXXXXXXX',
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-002',
        montant: 5000,
        commission: 25,
        montantNet: 4975,
        operator: Operator.WAVE,
        status: TransactionStatus.INITIATED,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: { nom: 'Kaboré', prenom: 'Pierre' },
        receiver: { nom: 'Sawadogo', prenom: 'Ali', telephone: '01XXXXXXXX' },
      });

      const result = await service.createTransaction('sender-002', {
        receiverPhone: '01XXXXXXXX',
        montant: 5000,
      });

      expect(result.deepLink).toContain('wave://send');
    });

    it('doit lancer NotFoundException si le receveur n\'existe pas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTransaction('sender-001', {
          receiverPhone: '07XXXXXXXX',
          montant: 10000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('doit lancer BadRequestException si sender = receiver', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'sender-001', telephone: '07XXXXXXXX' });

      await expect(
        service.createTransaction('sender-001', {
          receiverPhone: '07XXXXXXXX',
          montant: 10000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── confirmPaymentReceived() ──────────────────────────────
  describe('confirmPaymentReceived()', () => {
    it('doit passer le statut à FUNDS_HELD si paiement confirmé', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-003',
        status: TransactionStatus.INITIATED,
      });
      mockMobileMoneyService.receiveDeposit.mockResolvedValue(true);
      mockPrisma.transaction.update.mockResolvedValue({});

      await service.confirmPaymentReceived('tx-003');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-003' },
        data: { status: TransactionStatus.FUNDS_HELD },
      });
    });

    it('ne doit pas retraiter une transaction déjà en FUNDS_HELD', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-004',
        status: TransactionStatus.FUNDS_HELD,
      });

      await service.confirmPaymentReceived('tx-004');

      expect(mockMobileMoneyService.receiveDeposit).not.toHaveBeenCalled();
    });
  });

  // ─── refundTransaction() ───────────────────────────────────
  describe('refundTransaction()', () => {
    it('doit rembourser et passer le statut à REFUNDED', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-005',
        status: TransactionStatus.FUNDS_HELD,
      });
      mockMobileMoneyService.refundBuyer.mockResolvedValue(undefined);
      mockPrisma.transaction.update.mockResolvedValue({});

      await service.refundTransaction('tx-005');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-005' },
        data: { status: TransactionStatus.REFUNDED },
      });
    });

    it('doit lancer BadRequestException si transaction déjà COMPLETED', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-006',
        status: TransactionStatus.COMPLETED,
      });

      await expect(service.refundTransaction('tx-006')).rejects.toThrow(BadRequestException);
    });
  });
});
