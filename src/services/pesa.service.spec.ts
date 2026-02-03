/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { PesaService } from './pesa.service';

describe('PesaService', () => {
  let service: PesaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PesaService],
    }).compile();

    service = module.get<PesaService>(PesaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
