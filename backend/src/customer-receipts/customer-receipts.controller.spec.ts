import { Test, TestingModule } from '@nestjs/testing';
import { CustomerReceiptsController } from './customer-receipts.controller';

describe('CustomerReceiptsController', () => {
  let controller: CustomerReceiptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerReceiptsController],
    }).compile();

    controller = module.get<CustomerReceiptsController>(CustomerReceiptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
