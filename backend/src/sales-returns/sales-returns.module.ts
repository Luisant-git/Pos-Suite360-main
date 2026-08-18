import { Module } from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { SalesReturnsController } from './sales-returns.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
})
export class SalesReturnsModule {}
