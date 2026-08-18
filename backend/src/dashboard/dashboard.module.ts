import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerReceiptsModule } from '../customer-receipts/customer-receipts.module';
import { SupplierPaymentsModule } from '../supplier-payments/supplier-payments.module';

@Module({
  imports: [PrismaModule, CustomerReceiptsModule, SupplierPaymentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
