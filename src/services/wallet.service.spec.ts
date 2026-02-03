import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { WalletEntity } from '../entities/wallet.entity';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: WalletRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            findByPhone: jest.fn(),
            findByUserId: jest.fn(),
            findByUserIdAndCurrency: jest.fn(),
            createWallet: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get<WalletRepository>(WalletRepository);
  });

  describe('createWallet', () => {
    it('should create a new wallet', async () => {
      // Arrange
      const mockUserId = 'user123';
      const mockPhone = '256777123456';
      const mockWallet: Partial<WalletEntity> = {
        id: 'wallet123',
        userId: mockUserId,
        phone: mockPhone,
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findByUserIdAndCurrency').mockResolvedValue(null);
      jest.spyOn(walletRepository, 'createWallet').mockResolvedValue(mockWallet as WalletEntity);

      // Act
      const result = await service.createWallet(mockUserId, 'UGX', 0, mockPhone);

      // Assert
      expect(walletRepository.findByUserIdAndCurrency).toHaveBeenCalled();
      expect(walletRepository.createWallet).toHaveBeenCalledWith(mockUserId, 'UGX', 0, mockPhone);
      expect(result).toEqual(mockWallet);
    });

    it('should return existing wallet if it exists', async () => {
      // Arrange
      const mockUserId = 'user123';
      const mockPhone = '256777123456';
      const mockExistingWallet: Partial<WalletEntity> = {
        id: 'wallet123',
        userId: mockUserId,
        phone: mockPhone,
        balance: 1000,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findByUserIdAndCurrency').mockResolvedValue(mockExistingWallet as WalletEntity);

      // Act
      const result = await service.createWallet(mockUserId, 'UGX', 0, mockPhone);

      // Assert
      expect(walletRepository.findByUserIdAndCurrency).toHaveBeenCalled();
      expect(walletRepository.createWallet).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingWallet);
    });
  });

  describe('findByPhone', () => {
    it('should find wallet by phone number', async () => {
      // Arrange
      const mockPhone = '256777123456';
      const mockWallet: Partial<WalletEntity> = {
        id: 'wallet123',
        userId: 'user123',
        phone: mockPhone,
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findByPhone').mockResolvedValue(mockWallet as WalletEntity);

      // Act
      const result = await service.findByPhone(mockPhone);

      // Assert
      expect(walletRepository.findByPhone).toHaveBeenCalledWith(mockPhone);
      expect(result).toEqual(mockWallet);
    });
  });

  describe('findByUserId', () => {
    it('should find wallet by user id', async () => {
      // Arrange
      const mockUserId = 'user123';
      const mockWallet: Partial<WalletEntity> = {
        id: 'wallet123',
        userId: mockUserId,
        phone: '256777123456',
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findByUserId').mockResolvedValue(mockWallet as WalletEntity);

      // Act
      const result = await service.findByUserId(mockUserId);

      // Assert
      expect(walletRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockWallet);
    });
  });

  describe('findById', () => {
    it('should find wallet by id', async () => {
      // Arrange
      const mockId = 'wallet123';
      const mockWallet: Partial<WalletEntity> = {
        id: mockId,
        userId: 'user123',
        phone: '256777123456',
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findOneBy').mockResolvedValue(mockWallet as WalletEntity);

      // Act
      const result = await service.findById(mockId);

      // Assert
      expect(walletRepository.findOneBy).toHaveBeenCalledWith({ id: mockId });
      expect(result).toEqual(mockWallet);
    });
  });

  describe('updateWallet', () => {
    it('should update wallet details', async () => {
      // Arrange
      const mockId = 'wallet123';
      const mockWallet: Partial<WalletEntity> = {
        id: mockId,
        userId: 'user123',
        phone: '256777123456',
        balance: 0,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateData = { phone: '256777654321' };

      jest.spyOn(walletRepository, 'findOneBy').mockResolvedValue(mockWallet as WalletEntity);
      jest.spyOn(walletRepository, 'save').mockResolvedValue({ 
        ...mockWallet, 
        ...updateData 
      } as WalletEntity);

      // Act
      const result = await service.updateWallet(mockId, updateData);

      // Assert
      expect(walletRepository.findOneBy).toHaveBeenCalledWith({ id: mockId });
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result.phone).toEqual(updateData.phone);
    });

    it('should throw error if wallet not found', async () => {
      // Arrange
      const mockId = 'wallet123';

      jest.spyOn(walletRepository, 'findOneBy').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateWallet(mockId, { phone: '256777654321' })).rejects.toThrow();
    });
  });

  describe('updateBalance', () => {
    it('should update wallet balance', async () => {
      // Arrange
      const mockId = 'wallet123';
      const initialBalance = 1000;
      const updateAmount = 500;
      const mockWallet: Partial<WalletEntity> = {
        id: mockId,
        userId: 'user123',
        phone: '256777123456',
        balance: initialBalance,
        currency: 'UGX',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'findOneBy').mockResolvedValue(mockWallet as WalletEntity);
      jest.spyOn(walletRepository, 'save').mockResolvedValue({
        ...mockWallet,
        balance: initialBalance + updateAmount,
      } as WalletEntity);

      // Act
      const result = await service.updateBalance(mockId, updateAmount);

      // Assert
      expect(walletRepository.findOneBy).toHaveBeenCalledWith({ id: mockId });
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result.balance).toEqual(initialBalance + updateAmount);
    });

    it('should throw error if wallet not found', async () => {
      // Arrange
      const mockId = 'wallet123';

      jest.spyOn(walletRepository, 'findOneBy').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateBalance(mockId, 500)).rejects.toThrow();
    });
  });
});
