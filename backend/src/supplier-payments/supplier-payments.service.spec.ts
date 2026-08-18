import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsService', () => {
  let service: SupplierPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupplierPaymentsService],
    }).compile();

    service = module.get<SupplierPaymentsService>(SupplierPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
