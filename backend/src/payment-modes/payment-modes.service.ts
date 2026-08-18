import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatePaymentModeDto } from './dto/create-payment-mode.dto';
import { UpdatePaymentModeDto } from './dto/update-payment-mode.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentModesService {
  constructor(private prisma: PrismaService) {}

  create(createPaymentModeDto: CreatePaymentModeDto) {
    return this.prisma.paymentMode.create({
      data: createPaymentModeDto,
    });
  }

  findAll() {
    return this.prisma.paymentMode.findMany({
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.paymentMode.findUnique({
      where: { id },
    });
  }

  update(id: number, updatePaymentModeDto: UpdatePaymentModeDto) {
    return this.prisma.paymentMode.update({
      where: { id },
      data: updatePaymentModeDto,
    });
  }

  async remove(id: number) {
    try {
      return await this.prisma.paymentMode.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Payment Mode because it is already used in transactions (e.g. Sales, Purchases, Receipts).');
      }
      throw error;
    }
  }
}
