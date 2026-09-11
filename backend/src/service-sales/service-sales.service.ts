import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceSaleDto } from './dto/create-service-sale.dto';

@Injectable()
export class ServiceSalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceSaleDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Auto-generate invoice number
      const settings = await tx.settings.findUnique({ where: { id: 1 } });
      const prefix = settings?.serviceInvoicePrefix || 'SRV-';

      const lastSale = await tx.serviceSale.findFirst({
        orderBy: { invoiceNo: 'desc' },
        select: { invoiceNo: true },
      });

      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNo.startsWith(prefix)) {
        const remaining = lastSale.invoiceNo.substring(prefix.length);
        const match = remaining.match(/^(\d+)/);
        if (match && !isNaN(parseInt(match[1], 10))) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const invoiceNo = `${prefix}${String(nextNumber).padStart(5, '0')}`;

      // 2. Resolve customer (optional — default to Cash Customer)
      let resolvedCustomerId = dto.customerId || null;
      if (!resolvedCustomerId) {
        let cashCustomer = await tx.customer.findFirst({ where: { name: 'Cash Customer' } });
        if (!cashCustomer) {
          cashCustomer = await tx.customer.create({
            data: { name: 'Cash Customer', phone: '0000000000' },
          });
        }
        resolvedCustomerId = cashCustomer.id;
      }

      // 3. Create ServiceSale (no stock update)
      const sale = await tx.serviceSale.create({
        data: {
          invoiceNo,
          date: new Date(dto.date),
          customerId: resolvedCustomerId,
          userId,
          paymentModeId: dto.paymentModeId,
          subtotal: dto.subtotal,
          tax: dto.tax || 0,
          discount: dto.discount || 0,
          grandTotal: dto.grandTotal,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              serviceItemId: item.serviceItemId || null,
              serviceName: item.serviceName,
              quantity: item.quantity ?? 1,
              rate: item.rate,
              discount: item.discount || 0,
              tax: item.tax || 0,
              amount: item.amount,
            })),
          },
        },
        include: {
          items: { include: { serviceItem: true } },
          customer: true,
          paymentMode: true,
        },
      });

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
    if (query?.customerId) where.customerId = Number(query.customerId);
    if (query?.invoiceNo) where.invoiceNo = { contains: query.invoiceNo, mode: 'insensitive' };
    if (query?.paymentModeId) where.paymentModeId = Number(query.paymentModeId);

    return this.prisma.serviceSale.findMany({
      where,
      include: {
        customer: true,
        paymentMode: true,
        items: { include: { serviceItem: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const sale = await this.prisma.serviceSale.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentMode: true,
        user: { select: { id: true, name: true, username: true } },
        items: { include: { serviceItem: true } },
      },
    });
    if (!sale) throw new NotFoundException(`Service sale #${id} not found`);
    return sale;
  }

  async getNextInvoiceNo() {
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    const prefix = settings?.serviceInvoicePrefix || 'SRV-';

    const lastSale = await this.prisma.serviceSale.findFirst({
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });

    let nextNumber = 1;
    if (lastSale && lastSale.invoiceNo.startsWith(prefix)) {
      const remaining = lastSale.invoiceNo.substring(prefix.length);
      const match = remaining.match(/^(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async remove(id: number) {
    await this.findOne(id);
    // Delete items cascade (onDelete: Cascade in schema), then delete sale
    await this.prisma.serviceSaleItem.deleteMany({ where: { serviceSaleId: id } });
    return this.prisma.serviceSale.delete({ where: { id } });
  }
}
