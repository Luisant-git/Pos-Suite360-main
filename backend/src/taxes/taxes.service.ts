import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  create(createTaxDto: any) {
    return this.prisma.tax.create({
      data: createTaxDto,
    });
  }

  findAll() {
    return this.prisma.tax.findMany({
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.tax.findUnique({
      where: { id },
    });
  }

  update(id: number, updateTaxDto: any) {
    return this.prisma.tax.update({
      where: { id },
      data: updateTaxDto,
    });
  }

  remove(id: number) {
    return this.prisma.tax.delete({
      where: { id },
    });
  }
}
