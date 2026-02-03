import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentEntity, PaymentStatus, PaymentType } from '../entities/payment.entity';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: PaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            createPayment: jest.fn(),
            findByReference: jest.fn(),
            findByType: jest.fn(),
            findByStatus: jest.fn(),
            findByProvider: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<PaymentRepository>(PaymentRepository);
  });

  describe('createPayment', () => {
    it('should create a new payment', async () => {
      // Arrange
      const mockPaymentData = {
        reference: 'txn123',
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
      };
      const mockCreatedPayment: Partial<PaymentEntity> = {
        id: 'payment123',
        ...mockPaymentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findByReference').mockResolvedValue(null);
      jest.spyOn(paymentRepository, 'createPayment').mockResolvedValue(mockCreatedPayment as PaymentEntity);

      // Act
      const result = await service.createPayment(
        mockPaymentData.reference,
        mockPaymentData.type,
        mockPaymentData.amount,
        mockPaymentData.provider,
        undefined,
        mockPaymentData.status,
      );

      // Assert
      expect(paymentRepository.findByReference).toHaveBeenCalledWith(mockPaymentData.reference);
      expect(paymentRepository.createPayment).toHaveBeenCalledWith(
        mockPaymentData.reference,
        mockPaymentData.type,
        mockPaymentData.amount,
        mockPaymentData.provider,
        undefined,
        mockPaymentData.status,
      );
      expect(result).toEqual(mockCreatedPayment);
    });

    it('should return existing payment if it exists', async () => {
      // Arrange
      const mockPaymentData = {
        reference: 'txn123',
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
      };
      const mockExistingPayment: Partial<PaymentEntity> = {
        id: 'payment123',
        ...mockPaymentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findByReference').mockResolvedValue(mockExistingPayment as PaymentEntity);

      // Act
      const result = await service.createPayment(
        mockPaymentData.reference,
        mockPaymentData.type,
        mockPaymentData.amount,
        mockPaymentData.provider,
        undefined,
        mockPaymentData.status,
      );

      // Assert
      expect(paymentRepository.findByReference).toHaveBeenCalledWith(mockPaymentData.reference);
      expect(paymentRepository.createPayment).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingPayment);
    });
  });

  describe('findByReference', () => {
    it('should find payment by reference', async () => {
      // Arrange
      const mockReference = 'txn123';
      const mockPayment: Partial<PaymentEntity> = {
        id: 'payment123',
        reference: mockReference,
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findByReference').mockResolvedValue(mockPayment as PaymentEntity);

      // Act
      const result = await service.findByReference(mockReference);

      // Assert
      expect(paymentRepository.findByReference).toHaveBeenCalledWith(mockReference);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('findById', () => {
    it('should find payment by ID', async () => {
      // Arrange
      const mockId = 'payment123';
      const mockPayment: Partial<PaymentEntity> = {
        id: mockId,
        reference: 'txn123',
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment as PaymentEntity);

      // Act
      const result = await service.findById(mockId);

      // Assert
      expect(paymentRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockPayment);
    });
  });

  describe('findByType', () => {
    it('should find payments by type', async () => {
      // Arrange
      const mockType = PaymentType.COLLECTION;
      const mockPayments: Partial<PaymentEntity>[] = [
        {
          id: 'payment123',
          reference: 'txn123',
          type: mockType,
          amount: 1000,
          provider: 'airtel',
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'payment456',
          reference: 'txn456',
          type: mockType,
          amount: 2000,
          provider: 'airtel',
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(paymentRepository, 'findByType').mockResolvedValue(mockPayments as PaymentEntity[]);

      // Act
      const result = await service.findByType(mockType);

      // Assert
      expect(paymentRepository.findByType).toHaveBeenCalledWith(mockType);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('findByStatus', () => {
    it('should find payments by status', async () => {
      // Arrange
      const mockStatus = PaymentStatus.PENDING;
      const mockPayments: Partial<PaymentEntity>[] = [
        {
          id: 'payment123',
          reference: 'txn123',
          type: PaymentType.COLLECTION,
          amount: 1000,
          provider: 'airtel',
          status: mockStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'payment456',
          reference: 'txn456',
          type: PaymentType.COLLECTION,
          amount: 2000,
          provider: 'airtel',
          status: mockStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(paymentRepository, 'findByStatus').mockResolvedValue(mockPayments as PaymentEntity[]);

      // Act
      const result = await service.findByStatus(mockStatus);

      // Assert
      expect(paymentRepository.findByStatus).toHaveBeenCalledWith(mockStatus);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('findByProvider', () => {
    it('should find payments by provider', async () => {
      // Arrange
      const mockProvider = 'airtel';
      const mockPayments: Partial<PaymentEntity>[] = [
        {
          id: 'payment123',
          reference: 'txn123',
          type: PaymentType.COLLECTION,
          amount: 1000,
          provider: mockProvider,
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'payment456',
          reference: 'txn456',
          type: PaymentType.COLLECTION,
          amount: 2000,
          provider: mockProvider,
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(paymentRepository, 'findByProvider').mockResolvedValue(mockPayments as PaymentEntity[]);

      // Act
      const result = await service.findByProvider(mockProvider);

      // Assert
      expect(paymentRepository.findByProvider).toHaveBeenCalledWith(mockProvider);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      // Arrange
      const mockId = 'payment123';
      const newStatus = PaymentStatus.SUCCESS;
      const mockPayment: Partial<PaymentEntity> = {
        id: mockId,
        reference: 'txn123',
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment as PaymentEntity);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({ 
        ...mockPayment, 
        status: newStatus 
      } as PaymentEntity);

      // Act
      const result = await service.updateStatus(mockId, newStatus);

      // Assert
      expect(paymentRepository.findOne).toHaveBeenCalled();
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(newStatus);
    });

    it('should throw error if payment not found', async () => {
      // Arrange
      const mockId = 'payment123';
      const newStatus = PaymentStatus.SUCCESS;

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStatus(mockId, newStatus)).rejects.toThrow();
    });
  });

  describe('updateRawResponse', () => {
    it('should update payment raw response', async () => {
      // Arrange
      const mockId = 'payment123';
      const rawResponse = { status: 'SUCCESS', data: 'payment details' };
      const mockPayment: Partial<PaymentEntity> = {
        id: mockId,
        reference: 'txn123',
        type: PaymentType.COLLECTION,
        amount: 1000,
        provider: 'airtel',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment as PaymentEntity);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({ 
        ...mockPayment, 
        rawResponse 
      } as PaymentEntity);

      // Act
      const result = await service.updateRawResponse(mockId, rawResponse);

      // Assert
      expect(paymentRepository.findOne).toHaveBeenCalled();
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(result.rawResponse).toEqual(rawResponse);
    });

    it('should throw error if payment not found', async () => {
      // Arrange
      const mockId = 'payment123';
      const rawResponse = { status: 'SUCCESS', data: 'payment details' };

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateRawResponse(mockId, rawResponse)).rejects.toThrow();
    });
  });
});
