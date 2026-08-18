import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto, userId: number) {
    // Execute in a transaction to guarantee data integrity between sale and stock ledger
    return this.prisma.$transaction(async (tx) => {
      
      // 0. Auto-generate the correct invoice number safely inside the transaction
      const settings = await tx.settings.findUnique({ where: { id: 1 } });
      const prefix = settings?.invoicePrefix || 'INV-';
      
      const lastSale = await tx.sale.findFirst({
        orderBy: { invoiceNo: 'desc' },
        select: { invoiceNo: true },
      });

      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNo.startsWith(prefix)) {
        const remainingStr = lastSale.invoiceNo.substring(prefix.length);
        const match = remainingStr.match(/^(\d+)/);
        if (match && !isNaN(parseInt(match[1], 10))) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const finalInvoiceNo = `${prefix}${String(nextNumber).padStart(5, '0')}`;

      // 1. Create Sale and SaleItems
      const sale = await tx.sale.create({
        data: {
          invoiceNo: finalInvoiceNo,
          date: new Date(createSaleDto.date),
          customerId: createSaleDto.customerId,
          userId: userId,
          paymentModeId: createSaleDto.paymentModeId,
          subtotal: createSaleDto.subtotal,
          tax: createSaleDto.tax || 0,
          discount: createSaleDto.discount || 0,
          grandTotal: createSaleDto.grandTotal,
          items: {
            create: createSaleDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount || 0,
              tax: item.tax || 0,
              amount: item.amount,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Update stock and ledger for each item
      for (const item of createSaleDto.items) {
        const currentProduct = await tx.product.findUnique({ where: { id: item.productId } });
        if (!currentProduct) {
          throw new BadRequestException(`Product not found: ${item.productId}`);
        }

        const dataToUpdate: any = {
          currentStock: { decrement: item.quantity },
        };

        if (item.rate > Number(currentProduct.sellingRate)) {
          dataToUpdate.sellingRate = item.rate;
        }

        // Decrement current stock (allow negative stock to let checkout proceed)
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: dataToUpdate,
        });

        // Add ledger entry
        await tx.stockTransaction.create({
          data: {
            date: new Date(createSaleDto.date),
            productId: item.productId,
            type: TransactionType.SALE,
            quantityIn: 0,
            quantityOut: item.quantity,
            balance: updatedProduct.currentStock,
            reference: sale.invoiceNo,
          },
        });
      }
      return sale;
    });
  }

  findAll(query?: any) {
    const where: any = {};
    if (query?.fromDate || query?.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) {
        const toDate = new Date(query.toDate);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }
    if (query?.customerId) {
      where.customerId = Number(query.customerId);
    }
    if (query?.invoiceNo) {
      where.invoiceNo = { contains: query.invoiceNo, mode: 'insensitive' };
    }
    if (query?.paymentModeId) {
      where.paymentModeId = Number(query.paymentModeId);
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        customer: true,
        paymentMode: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
    });
  }

  findOne(id: number) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentMode: true,
        user: {
          select: { id: true, name: true, username: true }
        },
        items: {
          include: {
            product: {
              include: {
                unit: true
              }
            },
          },
        },
      },
    });
  }

  async getNextInvoiceNo() {
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    const prefix = settings?.invoicePrefix || 'INV-';

    const lastSale = await this.prisma.sale.findFirst({
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });

    let nextNumber = 1;
    if (lastSale && lastSale.invoiceNo.startsWith(prefix)) {
      const remainingStr = lastSale.invoiceNo.substring(prefix.length);
      const match = remainingStr.match(/^(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!sale) {
        throw new BadRequestException('Sale not found');
      }

      // 1. Reverse stock and ledger
      for (const item of sale.items) {
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
          },
        });

        // Add reverting ledger entry
        await tx.stockTransaction.create({
          data: {
            date: new Date(),
            productId: item.productId,
            type: TransactionType.SALE_RETURN,
            quantityIn: item.quantity,
            quantityOut: 0,
            balance: updatedProduct.currentStock,
            reference: `Reverted ${sale.invoiceNo}`,
          },
        });
      }

      // 2. Delete Sale Items
      await tx.saleItem.deleteMany({
        where: { saleId: id },
      });

      // 3. Delete Sale
      return tx.sale.delete({
        where: { id },
      });
    });
  }
}
