import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {
          id: 1,
          shopName: 'My Shop',
          currencySymbol: 'RM',
          currencyPosition: 'before',
          invoicePrefix: 'INV-',
        },
      });
    }

    return settings;
  }

  async updateSettings(data: any) {
    return this.prisma.settings.upsert({
      where: { id: 1 },
      update: {
        shopName: data.shopName,
        shopAddress: data.shopAddress,
        state: data.state,
        phone: data.phone,
        email: data.email,
        currencySymbol: data.currencySymbol,
        currencyPosition: data.currencyPosition,
        invoicePrefix: data.invoicePrefix,
        invoiceNotes: data.invoiceNotes,
        signatureImage: data.signatureImage,
        enableTax: data.enableTax === true || data.enableTax === 'true',
        taxType: data.taxType,
      },
      create: {
        id: 1,
        shopName: data.shopName || 'My Shop',
        shopAddress: data.shopAddress,
        state: data.state,
        phone: data.phone,
        email: data.email,
        currencySymbol: data.currencySymbol || 'RM',
        currencyPosition: data.currencyPosition || 'before',
        invoicePrefix: data.invoicePrefix || 'INV-',
        invoiceNotes: data.invoiceNotes,
        signatureImage: data.signatureImage,
        enableTax: data.enableTax === true || data.enableTax === 'true',
        taxType: data.taxType || 'exclusive',
      },
    });
  }

  async resetDatabase() {
    try {
      // Delete all records from transactional tables
      await this.prisma.saleItem.deleteMany();
      await this.prisma.sale.deleteMany();
      await this.prisma.purchaseItem.deleteMany();
      await this.prisma.purchase.deleteMany();
      await this.prisma.stockTransaction.deleteMany();
      await this.prisma.expense.deleteMany();
      await this.prisma.supplierPayment.deleteMany();
      await this.prisma.customerReceipt.deleteMany();
      
      // Delete Master Data
      await this.prisma.product.deleteMany();
      await this.prisma.supplier.deleteMany();
      await this.prisma.customer.deleteMany();
      await this.prisma.category.deleteMany();
      await this.prisma.brand.deleteMany();
      await this.prisma.unit.deleteMany();
      await this.prisma.expenseCategory.deleteMany();

      return { message: 'Database reset successfully' };
    } catch (error) {
      console.error('Reset DB Error:', error);
      throw new BadRequestException('Failed to reset database: ' + (error.message || ''));
    }
  }
}
