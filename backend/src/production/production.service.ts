import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto } from './dto/create-production.dto';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  async create(createProductionDto: CreateProductionDto) {
    const { date, workName, rawMaterialId, intakeQuantity, finishedProductId, outcomeQuantity } = createProductionDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Production Entry
      const production = await tx.production.create({
        data: {
          date: new Date(date),
          workName,
          rawMaterialId,
          intakeQuantity,
          finishedProductId,
          outcomeQuantity,
        },
      });

      // 2. Deduct Raw Material Stock
      const rawMaterial = await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: { currentStock: { decrement: intakeQuantity } },
      });

      // 4. Increase Finished Product Stock
      const finishedProduct = await tx.product.update({
        where: { id: finishedProductId },
        data: { currentStock: { increment: outcomeQuantity } },
      });

      // 5. Add Finished Product Stock Ledger Entry
      await tx.stockTransaction.create({
        data: {
          productId: finishedProductId,
          type: 'ADJUSTMENT', // Or a new type 'PRODUCTION_OUTCOME'
          quantityIn: outcomeQuantity,
          balance: finishedProduct.currentStock,
          reference: `Production Outcome - ${workName}`,
          date: new Date(date),
        },
      });

      return production;
    });
  }

  findAll() {
    return this.prisma.production.findMany({
      include: {
        rawMaterial: true,
        finishedProduct: true,
      },
      orderBy: { date: 'desc' }
    });
  }

  async findOne(id: number) {
    const production = await this.prisma.production.findUnique({
      where: { id },
      include: {
        rawMaterial: true,
        finishedProduct: true,
      }
    });
    if (!production) {
      throw new Error('Production entry not found');
    }
    return production;
  }
}
