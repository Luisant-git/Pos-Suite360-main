import { Module } from '@nestjs/common';
import { PurchaseReturnsService } from './purchase-returns.service';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
