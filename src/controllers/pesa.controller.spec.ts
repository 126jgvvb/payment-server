import { Test, TestingModule } from '@nestjs/testing';
import { PesaController } from './pesa.controller';

describe('PesaController', () => {
  let controller: PesaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PesaController],
    }).compile();

    controller = module.get<PesaController>(PesaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
