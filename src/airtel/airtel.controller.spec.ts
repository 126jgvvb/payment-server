import { Test, TestingModule } from '@nestjs/testing';
import { AirtelController } from './airtel.controller';
import { AirtelService } from './airtel.service';
import { FraudService } from './fraud.service';
import { AirtelCollectDto, AirtelPayoutDto } from './airtel.dto';
import { MomoWithdrawRequestDto } from '../dtos/momo.dto';

describe('AirtelController', () => {
  let controller: AirtelController;
  let airtelService: AirtelService;
  let fraudService: FraudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirtelController],
      providers: [
        {
          provide: AirtelService,
          useValue: {
            collectMoney: jest.fn().mockResolvedValue({}),
            disburseMoney: jest.fn().mockResolvedValue({}),
            checkStatus: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: FraudService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AirtelController>(AirtelController);
    airtelService = module.get<AirtelService>(AirtelService);
    fraudService = module.get<FraudService>(FraudService);
  });

  describe('collect', () => {
    it('should call fraud check and collect money', async () => {
      // Arrange
      const dto: AirtelCollectDto = {
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
        reSellerPhoneNumber: '256777123456',
      };
      const mockResponse = {
        data: {
          status: 'SUCCESS',
          transactionId: '12345',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        },
      } as any;

      jest.spyOn(fraudService, 'check').mockImplementation();
      jest.spyOn(airtelService, 'collectMoney').mockResolvedValue(mockResponse);

      // Act
      const result = await controller.collect(dto);

      // Assert
      expect(fraudService.check).toHaveBeenCalledWith(dto);
      expect(airtelService.collectMoney).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('payout', () => {
    it('should call disburse money service', async () => {
      // Arrange
      const dto: AirtelPayoutDto = {
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
      };
      const mockResponse = {
        data: {
          status: 'SUCCESS',
          transactionId: '12345',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        },
      } as any;

      jest.spyOn(airtelService, 'disburseMoney').mockResolvedValue(mockResponse);

      // Act
      const result = controller.payout(dto);

      // Assert
      expect(airtelService.disburseMoney).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('status', () => {
    it('should call check status service', async () => {
      // Arrange
      const mockResponse = {
        data: {
          status: 'SUCCESS',
          transactionId: '12345',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        },
      } as any;

      jest.spyOn(airtelService, 'checkStatus').mockResolvedValue(mockResponse);

      // Act
      const result = controller.status('12345');

      // Assert
      expect(airtelService.checkStatus).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('requestWithdrawal', () => {
    it('should handle withdrawal request', async () => {
      // Arrange
      const dto: MomoWithdrawRequestDto = {
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
      };

      // Act
      const result = controller.requestWithdrawal(dto);

      // Assert
      // Currently this method is empty, but it should be implemented
      expect(result).toBeUndefined();
    });
  });

  describe('approve', () => {
    it('should handle withdrawal approval', async () => {
      // Arrange
      const mockId = '12345';

      // Act
      const result = controller.approve(mockId);

      // Assert
      // Currently this method is empty, but it should be implemented
      expect(result).toBeUndefined();
    });
  });
});
