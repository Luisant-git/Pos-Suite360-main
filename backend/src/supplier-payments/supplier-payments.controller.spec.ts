import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsController } from './supplier-payments.controller';

describe('SupplierPaymentsController', () => {
  let controller: SupplierPaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentsController],
    }).compile();

    controller = module.get<SupplierPaymentsController>(SupplierPaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
