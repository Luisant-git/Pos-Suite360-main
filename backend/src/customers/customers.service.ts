import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(createCustomerDto: CreateCustomerDto) {
    const { productRates, ...data } = createCustomerDto;
    return this.prisma.customer.create({
      data: {
        ...data,
        productRates: productRates?.length ? {
          create: productRates
        } : undefined
      },
      include: {
        productRates: {
          include: {
            product: true
          }
        }
      }
    });
  }

  findAll() {
    return this.prisma.customer.findMany({
      orderBy: { id: 'desc' },
      include: {
        productRates: {
          include: {
            product: true
          }
        }
      }
    });
  }

  findOne(id: number) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        productRates: {
          include: {
            product: true
          }
        }
      }
    });
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const { productRates, ...data } = updateCustomerDto;
    
    if (productRates) {
      await this.prisma.customerProductRate.deleteMany({ where: { customerId: id } });
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        productRates: productRates?.length ? {
          create: productRates
        } : undefined
      },
      include: {
        productRates: {
          include: {
            product: true
          }
        }
      }
    });
  }

  remove(id: number) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
