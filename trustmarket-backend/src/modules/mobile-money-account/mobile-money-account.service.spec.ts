// ============================================================
//  Tests unitaires — MobileMoneyAccountService
//  DEV 2 — Semaine 4
// ============================================================
import { Test, TestingModule } from '@nestjs/testing';
import { MobileMoneyAccountService } from './mobile-money-account.service';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MobileMoneyLogType, MobileMoneyLogStatus, Operator, TransactionStatus } from '@prisma/client';

// ─── Mocks ──────────────────────────────────────────────────
const mockPrisma = {
  transaction: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  mobileMoneyLog: {
    create: jest.fn(),
  },
};

const mockOmProvider = {
  checkPaymentStatus: jest.fn(),
  sendMoney: jest.fn(),
  getBalance: jest.fn(),
};

const mockWaveProvider = {
  checkPaymentStatus: jest.fn(),
  sendMoney: jest.fn(),
  getBalance: jest.fn(),
};

// ─── Setup ──────────────────────────────────────────────────
describe('MobileMoneyAccountService', () => {
  let service: MobileMoneyAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileMoneyAccountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrangeMoneyProvider, useValue: mockOmProvider },
        { provide: WaveProvider, useValue: mockWaveProvider },
      ],
    }).compile();

    service = module.get<MobileMoneyAccountService>(MobileMoneyAccountService);

    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
  });

  // ─── receiveDeposit() ──────────────────────────────────────
  describe('receiveDeposit()', () => {
    it('doit retourner true si le paiement OM est confirmé', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-001',
        montant: 10000,
        operator: Operator.ORANGE_MONEY,
        omRef: 'OM-REF-123',
        waveRef: null,
      });
      mockOmProvider.checkPaymentStatus.mockResolvedValue({ status: 'SUCCESS', amount: 10000, ref: 'OM-REF-123' });
      mockPrisma.mobileMoneyLog.create.mockResolvedValue({});

      const result = await service.receiveDeposit('tx-001');

      expect(result).toBe(true);
      expect(mockOmProvider.checkPaymentStatus).toHaveBeenCalledWith('OM-REF-123');
      expect(mockPrisma.mobileMoneyLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MobileMoneyLogType.DEPOSIT_RECEIVED,
            status: MobileMoneyLogStatus.SUCCESS,
          }),
        }),
      );
    });

    it('doit retourner false si le paiement est en attente', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-002',
        montant: 5000,
        operator: Operator.WAVE,
        omRef: null,
        waveRef: 'WAVE-REF-456',
      });
      mockWaveProvider.checkPaymentStatus.mockResolvedValue({ status: 'PENDING', amount: 0, ref: 'WAVE-REF-456' });

      const result = await service.receiveDeposit('tx-002');

      expect(result).toBe(false);
      expect(mockPrisma.mobileMoneyLog.create).not.toHaveBeenCalled();
    });

    it('doit lancer NotFoundException si la transaction n\'existe pas', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.receiveDeposit('tx-inexistant')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── releaseFunds() ────────────────────────────────────────
  describe('releaseFunds()', () => {
    it('doit virer le montantNet au vendeur et logger la commission', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-003',
        montant: 10000,
        operator: Operator.ORANGE_MONEY,
        omRef: 'OM-REF-789',
        waveRef: null,
        receiver: { telephone: '07XXXXXXXX' },
      });
      mockOmProvider.sendMoney.mockResolvedValue({ success: true, ref: 'RELEASE-123', message: 'OK' });
      mockPrisma.mobileMoneyLog.create.mockResolvedValue({});

      await service.releaseFunds('tx-003');

      // Vérifier que le virement est de 9950 FCFA (10000 - 0.5%)
      expect(mockOmProvider.sendMoney).toHaveBeenCalledWith(
        '07XXXXXXXX',
        9950,
        expect.any(String),
      );

      // Vérifier que 2 logs sont créés (RELEASE + COMMISSION)
      expect(mockPrisma.mobileMoneyLog.create).toHaveBeenCalledTimes(2);
    });

    it('doit lancer une erreur si le virement échoue', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-004',
        montant: 10000,
        operator: Operator.ORANGE_MONEY,
        omRef: 'OM-REF-000',
        waveRef: null,
        receiver: { telephone: '07XXXXXXXX' },
      });
      mockOmProvider.sendMoney.mockResolvedValue({ success: false, ref: '', message: 'Solde insuffisant' });

      await expect(service.releaseFunds('tx-004')).rejects.toThrow('Échec virement vendeur');
    });
  });

  // ─── refundBuyer() ─────────────────────────────────────────
  describe('refundBuyer()', () => {
    it('doit rembourser le montant TOTAL à l\'acheteur', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-005',
        montant: 10000,
        operator: Operator.WAVE,
        omRef: null,
        waveRef: 'WAVE-REF-111',
        sender: { telephone: '01XXXXXXXX' },
      });
      mockWaveProvider.sendMoney.mockResolvedValue({ success: true, ref: 'REFUND-123', message: 'OK' });
      mockPrisma.mobileMoneyLog.create.mockResolvedValue({});

      await service.refundBuyer('tx-005');

      // Vérifier que le remboursement est du montant TOTAL (pas de commission déduite)
      expect(mockWaveProvider.sendMoney).toHaveBeenCalledWith(
        '01XXXXXXXX',
        10000, // montant total
        expect.any(String),
      );
    });
  });

  // ─── getAccountBalance() ───────────────────────────────────
  describe('getAccountBalance()', () => {
    it('doit retourner les soldes OM et Wave en parallèle', async () => {
      mockOmProvider.getBalance.mockResolvedValue(500000);
      mockWaveProvider.getBalance.mockResolvedValue(300000);

      const result = await service.getAccountBalance();

      expect(result).toEqual({ om: 500000, wave: 300000 });
      expect(mockOmProvider.getBalance).toHaveBeenCalledTimes(1);
      expect(mockWaveProvider.getBalance).toHaveBeenCalledTimes(1);
    });
  });
});
