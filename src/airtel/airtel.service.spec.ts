import { Test, TestingModule } from '@nestjs/testing';
import { AirtelService } from './airtel.service';
import { HttpService } from '@nestjs/axios';
import { MtnService } from './mtn/mtn.service';
import { of } from 'rxjs';

describe('AirtelService', () => {
  let service: AirtelService;
  let httpService: HttpService;
  let mtnService: MtnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: MtnService,
          useValue: {
            collect: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelService>(AirtelService);
    httpService = module.get<HttpService>(HttpService);
    mtnService = module.get<MtnService>(MtnService);
  });

  describe('getAccessToken', () => {
    it('should return access token from API if not cached', async () => {
      // Arrange
      const mockToken = 'mock-access-token';
      const mockResponse = {
        data: {
          access_token: mockToken,
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        },
      } as any;
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Act
      const token = await service['getAccessToken']();

      // Assert
      expect(token).toEqual(mockToken);
      expect(httpService.post).toHaveBeenCalled();
    });
  });

  describe('collectMoney', () => {
    it('should call Airtel API to collect money', async () => {
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
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));
      
      // Mock getAccessToken
      jest.spyOn(service as any, 'getAccessToken').mockResolvedValue('mock-token');

      // Act
      const result = await service.collectMoney({
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
        reSellerPhoneNumber: '256777123456',
      });

      // Assert
      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('collectFunds', () => {
    it('should call collectMoney and fallback to MTN if Airtel fails', async () => {
      // Arrange
      const mockError = new Error('Airtel API failed');
      const mockMtnResponse = {
        data: {
          status: 'SUCCESS',
          transactionId: 'mtn123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {},
        },
      } as any;

      jest.spyOn(service, 'collectMoney').mockRejectedValue(mockError);
      jest.spyOn(mtnService, 'collect').mockResolvedValue(mockMtnResponse);

      // Act
      const result = await service.collectFunds({
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
        reSellerPhoneNumber: '256777123456',
      });

      // Assert
      expect(service.collectMoney).toHaveBeenCalled();
      expect(mtnService.collect).toHaveBeenCalled();
      expect(result).toEqual(mockMtnResponse);
    });
  });

  describe('disburseMoney', () => {
    it('should call Airtel API to disburse money', async () => {
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
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));
      
      // Mock getAccessToken
      jest.spyOn(service as any, 'getAccessToken').mockResolvedValue('mock-token');

      // Act
      const result = await service.disburseMoney({
        phone: '256700123456',
        amount: 1000,
        reference: 'ref123',
      });

      // Assert
      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkStatus', () => {
    it('should call Airtel API to check transaction status', async () => {
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
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));
      
      // Mock getAccessToken
      jest.spyOn(service as any, 'getAccessToken').mockResolvedValue('mock-token');

      // Act
      const result = await service.checkStatus('12345');

      // Assert
      expect(httpService.get).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });
});
