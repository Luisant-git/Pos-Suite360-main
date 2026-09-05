import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateEstimationDto } from './dto/create-estimation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class EstimationsService {
  constructor(private prisma: PrismaService) {}

  async create(createEstimationDto: CreateEstimationDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 0. Auto-generate estimation number
      const settings = await tx.settings.findUnique({ where: { id: 1 } });
      const prefix = 'EST-';
      
      let finalEstimationNo = createEstimationDto.estimationNo;
      if (!finalEstimationNo) {
        const lastEstimation = await tx.estimation.findFirst({
          orderBy: { estimationNo: 'desc' },
          select: { estimationNo: true },
        });

        let nextNumber = 1;
        if (lastEstimation && lastEstimation.estimationNo.startsWith(prefix)) {
          const remainingStr = lastEstimation.estimationNo.substring(prefix.length);
          const match = remainingStr.match(/^(\d+)/);
          if (match && !isNaN(parseInt(match[1], 10))) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }
        finalEstimationNo = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      }

      // 1. Create Estimation and EstimationItems
      const estimation = await tx.estimation.create({
        data: {
          estimationNo: finalEstimationNo,
          date: new Date(createEstimationDto.date),
          customerId: createEstimationDto.customerId,
          userId: userId,
          subtotal: createEstimationDto.subtotal,
          discount: createEstimationDto.discount || 0,
          grandTotal: createEstimationDto.grandTotal,
          stockMaintained: settings?.estimationStockMaintain || false,
          items: {
            create: createEstimationDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount || 0,
              amount: item.amount,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Conditionally update stock if estimationStockMaintain is true
      if (settings?.estimationStockMaintain) {
        for (const item of createEstimationDto.items) {
          const currentProduct = await tx.product.findUnique({ where: { id: item.productId } });
          if (!currentProduct) {
            throw new BadRequestException(`Product not found: ${item.productId}`);
          }

          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });

          await tx.stockTransaction.create({
            data: {
              date: new Date(createEstimationDto.date),
              productId: item.productId,
              type: TransactionType.ESTIMATION,
              quantityIn: 0,
              quantityOut: item.quantity,
              balance: updatedProduct.currentStock,
              reference: estimation.estimationNo,
            },
          });
        }
      }
      return estimation;
    });
  }

  findAll(query?: any) {
    const where: any = {};
    if (query?.fromDate || query?.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }
    if (query?.customerId) {
      where.customerId = Number(query.customerId);
    }
    if (query?.estimationNo) {
      where.estimationNo = { contains: query.estimationNo, mode: 'insensitive' };
    }

    return this.prisma.estimation.findMany({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getNextEstimationNo() {
    const prefix = 'EST-';
    const lastEstimation = await this.prisma.estimation.findFirst({
      orderBy: { estimationNo: 'desc' },
      select: { estimationNo: true },
    });

    let nextNumber = 1;
    if (lastEstimation && lastEstimation.estimationNo.startsWith(prefix)) {
      const remainingStr = lastEstimation.estimationNo.substring(prefix.length);
      const match = remainingStr.match(/^(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  findOne(id: number) {
    return this.prisma.estimation.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const estimation = await tx.estimation.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!estimation) {
        throw new BadRequestException('Estimation not found');
      }

      const settings = await tx.settings.findUnique({ where: { id: 1 } });

      // Reverse stock if needed
      if (settings?.estimationStockMaintain) {
        for (const item of estimation.items) {
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockTransaction.create({
            data: {
              date: new Date(),
              productId: item.productId,
              type: TransactionType.ESTIMATION, // Ideally could be ESTIMATION_RETURN, but keeping simple
              quantityIn: item.quantity,
              quantityOut: 0,
              balance: updatedProduct.currentStock,
              reference: `Rev-${estimation.estimationNo}`,
            },
          });
        }
      }

      await tx.estimationItem.deleteMany({
        where: { estimationId: id },
      });

      return tx.estimation.delete({
        where: { id },
      });
    });
  }
  async updateStatus(id: number, status: string) {
    return this.prisma.estimation.update({
      where: { id },
      data: { status },
    });
  }

  async update(id: number, updateEstimationDto: any) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.estimation.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new BadRequestException('Estimation not found');

      const settings = await tx.settings.findUnique({ where: { id: 1 } });

      if (settings?.estimationStockMaintain) {
        for (const item of existing.items) {
           await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity } } });
        }
      }

      await tx.estimationItem.deleteMany({ where: { estimationId: id } });

      const updated = await tx.estimation.update({
        where: { id },
        data: {
          customerId: updateEstimationDto.customerId,
          date: new Date(updateEstimationDto.date),
          subtotal: updateEstimationDto.subtotal,
          discount: updateEstimationDto.discount || 0,
          grandTotal: updateEstimationDto.grandTotal,
          stockMaintained: settings?.estimationStockMaintain || false,
          items: {
            create: updateEstimationDto.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount || 0,
              amount: item.amount,
            }))
          }
        },
        include: { items: true }
      });

      if (settings?.estimationStockMaintain) {
        for (const item of updateEstimationDto.items) {
           await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity } } });
        }
      }

      return updated;
    });
  }
}
