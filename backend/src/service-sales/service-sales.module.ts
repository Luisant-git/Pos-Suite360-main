import { Module } from '@nestjs/common';
import { ServiceSalesService } from './service-sales.service';
import { ServiceSalesController } from './service-sales.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceSalesController],
  providers: [ServiceSalesService],
})
export class ServiceSalesModule {}
