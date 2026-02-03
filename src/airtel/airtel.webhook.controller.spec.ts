import { Test, TestingModule } from '@nestjs/testing';
import { AirtelWebhookController } from './airtel.webhook.controller';
import { LedgerService } from './ledger.service';
import { OtpService } from '../services/otp-service/otp2.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { WalletService } from '../services/wallet.service';
import { TransactionEntity } from '../entities/transaction.entity';
import { WalletEntity } from '../entities/wallet.entity';

describe('AirtelWebhookController', () => {
  let controller: AirtelWebhookController;
  let ledgerService: LedgerService;
  let otpService: OtpService;
  let transactionRepository: TransactionRepository;
  let walletService: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirtelWebhookController],
      providers: [
        {
          provide: LedgerService,
          useValue: {
            transfer: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            sendSmsVoucher: jest.fn(),
          },
        },
        {
          provide: TransactionRepository,
          useValue: {
            findByReference: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            findByPhone: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AirtelWebhookController>(AirtelWebhookController);
    ledgerService = module.get<LedgerService>(LedgerService);
    otpService = module.get<OtpService>(OtpService);
    transactionRepository = module.get<TransactionRepository>(TransactionRepository);
    walletService = module.get<WalletService>(WalletService);

    // Mock Redis to avoid actual connection
    (controller as any).redis = {
      get: jest.fn(),
    };
  });

  describe('handle', () => {
    it('should handle successful transaction and transfer funds', async () => {
      // Arrange
      const mockTransactionId = 'txn123';
      const mockResellerPhone = '256777123456';
      const mockPayload = {
        transaction: {
          id: mockTransactionId,
          status: 'SUCCESS',
        },
        phone: '256700123456',
        amount: 1000,
      };

      // Mock Redis to return reseller phone number
      (controller as any).redis.get = jest.fn().mockResolvedValue(mockResellerPhone);

      // Mock wallet service to find user wallet by phone number
      const mockWallet: Partial<WalletEntity> = {
        id: 'wallet123',
        userId: 'user123',
        phone: mockResellerPhone,
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(walletService, 'findByPhone').mockResolvedValue(mockWallet as WalletEntity);

      // Mock transaction repository
      const mockTransaction: Partial<TransactionEntity> = {
        id: 'txn123',
        reference: mockTransactionId,
        status: 'SUCCESS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(transactionRepository, 'findByReference').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction as any);

      // Mock ledger service transfer
      jest.spyOn(ledgerService, 'transfer').mockResolvedValue();

      // Mock OTP service
      jest.spyOn(otpService, 'sendSmsVoucher').mockResolvedValue(undefined);

      // Act
      const result = await controller.handle(
        mockPayload,
        { rawBody: Buffer.from(JSON.stringify(mockPayload)) },
        'valid-signature',
      );

      // Assert
      expect(transactionRepository.findByReference).toHaveBeenCalledWith(mockTransactionId);
      expect(transactionRepository.save).toHaveBeenCalled();
      expect(walletService.findByPhone).toHaveBeenCalledWith(mockResellerPhone);
      expect(ledgerService.transfer).toHaveBeenCalled();
      expect(otpService.sendSmsVoucher).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle failed transaction', async () => {
      // Arrange
      const mockTransactionId = 'txn123';
      const mockPayload = {
        transaction: {
          id: mockTransactionId,
          status: 'FAILED',
        },
        phone: '256700123456',
        amount: 1000,
      };

      // Mock transaction repository
      const mockTransaction: Partial<TransactionEntity> = {
        id: 'txn123',
        reference: mockTransactionId,
        status: 'FAILED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(transactionRepository, 'findByReference').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction as TransactionEntity);

      // Act
      const result = await controller.handle(
        mockPayload,
        { rawBody: Buffer.from(JSON.stringify(mockPayload)) },
        'valid-signature',
      );

      // Assert
      expect(transactionRepository.findByReference).toHaveBeenCalledWith(mockTransactionId);
      expect(transactionRepository.save).toHaveBeenCalled();
      expect(ledgerService.transfer).not.toHaveBeenCalled();
      expect(otpService.sendSmsVoucher).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return error for invalid signature', async () => {
      // Arrange
      const mockPayload = {
        transaction: {
          id: 'txn123',
          status: 'SUCCESS',
        },
        phone: '256700123456',
        amount: 1000,
      };

      // Act & Assert
      await expect(
        controller.handle(
          mockPayload,
          { rawBody: Buffer.from(JSON.stringify(mockPayload)) },
          'invalid-signature',
        ),
      ).rejects.toThrow();
    });

    it('should handle case when reseller phone not found in cache', async () => {
      // Arrange
      const mockTransactionId = 'txn123';
      const mockPayload = {
        transaction: {
          id: mockTransactionId,
          status: 'SUCCESS',
        },
        phone: '256700123456',
        amount: 1000,
      };

      // Mock Redis to return null (phone not found)
      (controller as any).redis.get = jest.fn().mockResolvedValue(null);

      // Mock transaction repository
      const mockTransaction: Partial<TransactionEntity> = {
        id: 'txn123',
        reference: mockTransactionId,
        status: 'SUCCESS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(transactionRepository, 'findByReference').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction as TransactionEntity);

      // Act
      const result = await controller.handle(
        mockPayload,
        { rawBody: Buffer.from(JSON.stringify(mockPayload)) },
        'valid-signature',
      );

      // Assert
      expect(transactionRepository.findByReference).toHaveBeenCalledWith(mockTransactionId);
      expect(transactionRepository.save).toHaveBeenCalled();
      expect(walletService.findByPhone).not.toHaveBeenCalled();
      expect(ledgerService.transfer).not.toHaveBeenCalled();
      expect(otpService.sendSmsVoucher).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle case when wallet not found for reseller phone', async () => {
      // Arrange
      const mockTransactionId = 'txn123';
      const mockResellerPhone = '256777123456';
      const mockPayload = {
        transaction: {
          id: mockTransactionId,
          status: 'SUCCESS',
        },
        phone: '256700123456',
        amount: 1000,
      };

      // Mock Redis to return reseller phone number
      (controller as any).redis.get = jest.fn().mockResolvedValue(mockResellerPhone);

      // Mock wallet service to return null (wallet not found)
      jest.spyOn(walletService, 'findByPhone').mockResolvedValue(null);

      // Mock transaction repository
      const mockTransaction: Partial<TransactionEntity> = {
        id: 'txn123',
        reference: mockTransactionId,
        status: 'SUCCESS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(transactionRepository, 'findByReference').mockResolvedValue(null);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction as TransactionEntity);

      // Act
      const result = await controller.handle(
        mockPayload,
        { rawBody: Buffer.from(JSON.stringify(mockPayload)) },
        'valid-signature',
      );

      // Assert
      expect(transactionRepository.findByReference).toHaveBeenCalledWith(mockTransactionId);
      expect(transactionRepository.save).toHaveBeenCalled();
      expect(walletService.findByPhone).toHaveBeenCalledWith(mockResellerPhone);
      expect(ledgerService.transfer).not.toHaveBeenCalled();
      expect(otpService.sendSmsVoucher).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
