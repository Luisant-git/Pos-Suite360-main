import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialPurchaseDto } from './dto/create-raw-material-purchase.dto';

@Injectable()
export class RawMaterialPurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(createRawMaterialPurchaseDto: CreateRawMaterialPurchaseDto) {
    const { invoiceNo, date, supplierId, subtotal, tax, grandTotal, paymentModeId, items } = createRawMaterialPurchaseDto;

    // Check if invoice already exists
    const existing = await this.prisma.rawMaterialPurchase.findUnique({
      where: { invoiceNo }
    });
    if (existing) {
      throw new BadRequestException('Invoice number already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase
      const purchase = await tx.rawMaterialPurchase.create({
        data: {
          invoiceNo,
          date: new Date(date),
          supplierId,
          subtotal,
          tax,
          grandTotal,
          paymentModeId,
          items: {
            create: items.map(item => ({
              rawMaterialId: item.rawMaterialId,
              widthMm: item.widthMm,
              lengthM: item.lengthM,
              sqM: item.sqM,
              quantity: item.quantity,
              price: item.price,
              amount: item.amount,
            }))
          }
        },
        include: { items: true }
      });

      // 2. Update Stock
      for (const item of items) {
        // Find existing product to calculate balance
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: { currentStock: { increment: item.quantity } },
        });
      }

      // Update Supplier Balance (if they track it)
      // Example: Adding to opening balance or having a separate ledger. 
      // Based on original POS, purchases might just be tracked via totals or we can increment opening balance if needed.
      // We'll skip balance logic unless explicitly requested to keep it simple and safe.

      return purchase;
    });
  }

  findAll() {
    return this.prisma.rawMaterialPurchase.findMany({
      include: {
        supplier: true,
        items: {
          include: { rawMaterial: true }
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async findOne(id: number) {
    const purchase = await this.prisma.rawMaterialPurchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { rawMaterial: true }
        }
      }
    });
    if (!purchase) {
      throw new BadRequestException('Purchase not found');
    }
    return purchase;
  }
}
