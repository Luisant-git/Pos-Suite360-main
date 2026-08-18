import { Test, TestingModule } from '@nestjs/testing';
import { CustomerReceiptsService } from './customer-receipts.service';

describe('CustomerReceiptsService', () => {
  let service: CustomerReceiptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerReceiptsService],
    }).compile();

    service = module.get<CustomerReceiptsService>(CustomerReceiptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
