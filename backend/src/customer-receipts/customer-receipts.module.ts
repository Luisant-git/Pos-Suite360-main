import { Module } from '@nestjs/common';
import { CustomerReceiptsService } from './customer-receipts.service';
import { CustomerReceiptsController } from './customer-receipts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerReceiptsController],
  providers: [CustomerReceiptsService],
  exports: [CustomerReceiptsService]
})
export class CustomerReceiptsModule {}
