import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentTypesService {
  constructor(private prisma: PrismaService) {}

  create(createPaymentTypeDto: CreatePaymentTypeDto) {
    return this.prisma.paymentType.create({
      data: createPaymentTypeDto,
    });
  }

  findAll() {
    return this.prisma.paymentType.findMany({
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.paymentType.findUnique({
      where: { id },
    });
  }

  update(id: number, updatePaymentTypeDto: UpdatePaymentTypeDto) {
    return this.prisma.paymentType.update({
      where: { id },
      data: updatePaymentTypeDto,
    });
  }

  async remove(id: number) {
    try {
      return await this.prisma.paymentType.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete Payment Type because it is already used in transactions.');
      }
      throw error;
    }
  }
}
