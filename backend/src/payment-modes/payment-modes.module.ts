import { Module } from '@nestjs/common';
import { PaymentModesService } from './payment-modes.service';
import { PaymentModesController } from './payment-modes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentModesController],
  providers: [PaymentModesService],
})
export class PaymentModesModule {}
