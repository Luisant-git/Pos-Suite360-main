import { Injectable, BadRequestException } from '@nestjs/common';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(createPurchaseReturnDto: CreatePurchaseReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase Return
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNo: createPurchaseReturnDto.returnNo,
          date: new Date(createPurchaseReturnDto.date),
          purchaseId: createPurchaseReturnDto.purchaseId,
          supplierId: createPurchaseReturnDto.supplierId,
          remarks: createPurchaseReturnDto.remarks,
          totalAmount: createPurchaseReturnDto.totalAmount,
          items: {
            create: createPurchaseReturnDto.items.map(item => ({
              productId: item.productId,
              returnQty: item.returnQty,
              rate: item.rate,
              amount: item.amount,
            }))
          }
        },
        include: { items: true }
      });

      // 2. Adjust Stock (deduct for purchase return)
      for (const item of createPurchaseReturnDto.items) {
        if (item.returnQty > 0) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);
          if (product.currentStock < item.returnQty) {
            throw new BadRequestException(`Insufficient stock for product ${product.name}`);
          }
          
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.returnQty } }
          });
          
          await tx.stockTransaction.create({
            data: {
              date: new Date(createPurchaseReturnDto.date),
              productId: item.productId,
              type: 'PURCHASE_RETURN',
              quantityOut: item.returnQty,
              balance: product.currentStock - item.returnQty,
              reference: createPurchaseReturnDto.returnNo
            }
          });
        }
      }

      // 3. Optional: Adjust Supplier balance if needed (e.g. decrease openingBalance or store credit, but keeping simple for now)

      return purchaseReturn;
    });
  }

  findAll() {
    return this.prisma.purchaseReturn.findMany({
      include: {
        supplier: true,
        purchase: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: number) {
    return this.prisma.purchaseReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        supplier: true,
        purchase: true
      }
    });
  }

  async getNextReturnNo() {
    const lastReturn = await this.prisma.purchaseReturn.findFirst({
      orderBy: { id: 'desc' },
      select: { returnNo: true },
    });

    let nextNumber = 1;
    if (lastReturn && lastReturn.returnNo.startsWith('PR-')) {
      const match = lastReturn.returnNo.match(/PR-(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `PR-${String(nextNumber).padStart(5, '0')}`;
  }
}
