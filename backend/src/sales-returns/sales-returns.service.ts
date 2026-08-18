import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(createSalesReturnDto: CreateSalesReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Sales Return
      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo: createSalesReturnDto.returnNo,
          date: new Date(createSalesReturnDto.date),
          saleId: createSalesReturnDto.saleId,
          customerId: createSalesReturnDto.customerId,
          userId: 1, // Ideally from req.user
          remarks: createSalesReturnDto.remarks,
          totalAmount: createSalesReturnDto.totalAmount,
          items: {
            create: createSalesReturnDto.items.map(item => ({
              productId: item.productId,
              returnQty: item.returnQty,
              rate: item.rate,
              amount: item.amount,
            }))
          }
        },
        include: { items: true }
      });

      // 2. Adjust Stock (add stock back for sales return)
      for (const item of createSalesReturnDto.items) {
        if (item.returnQty > 0) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);
          
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.returnQty } }
          });
          
          await tx.stockTransaction.create({
            data: {
              date: new Date(createSalesReturnDto.date),
              productId: item.productId,
              type: 'SALE_RETURN',
              quantityIn: item.returnQty,
              balance: product.currentStock + item.returnQty,
              reference: createSalesReturnDto.returnNo
            }
          });
        }
      }

      return salesReturn;
    });
  }

  findAll() {
    return this.prisma.salesReturn.findMany({
      include: {
        customer: true,
        sale: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: number) {
    return this.prisma.salesReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        sale: true
      }
    });
  }

  async getNextReturnNo() {
    const lastReturn = await this.prisma.salesReturn.findFirst({
      orderBy: { id: 'desc' },
      select: { returnNo: true },
    });

    let nextNumber = 1;
    if (lastReturn && lastReturn.returnNo.startsWith('SR-')) {
      const match = lastReturn.returnNo.match(/SR-(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `SR-${String(nextNumber).padStart(5, '0')}`;
  }
}
