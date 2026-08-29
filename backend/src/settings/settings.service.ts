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
        city: data.city,
        state: data.state,
        country: data.country,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        currencySymbol: data.currencySymbol,
        currencyPosition: data.currencyPosition,
        invoicePrefix: data.invoicePrefix,
        invoiceTitle: data.invoiceTitle,
        invoiceHeader: data.invoiceHeader,
        invoiceNotes: data.invoiceNotes,
        signatureImage: data.signatureImage,
        logoImage: data.logoImage,
        enableTax: data.enableTax === true || data.enableTax === 'true',
        taxType: data.taxType,
        enableCustomerWiseRate: data.enableCustomerWiseRate === true || data.enableCustomerWiseRate === 'true',
        estimationStockMaintain: data.estimationStockMaintain === true || data.estimationStockMaintain === 'true',
      },
      create: {
        id: 1,
        shopName: data.shopName || 'My Shop',
        shopAddress: data.shopAddress,
        city: data.city,
        state: data.state,
        country: data.country,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        currencySymbol: data.currencySymbol || 'RM',
        currencyPosition: data.currencyPosition || 'before',
        invoicePrefix: data.invoicePrefix || 'INV-',
        invoiceTitle: data.invoiceTitle || 'INVOICE',
        invoiceHeader: data.invoiceHeader,
        invoiceNotes: data.invoiceNotes,
        signatureImage: data.signatureImage,
        logoImage: data.logoImage,
        enableTax: data.enableTax === true || data.enableTax === 'true',
        taxType: data.taxType || 'exclusive',
        enableCustomerWiseRate: data.enableCustomerWiseRate === true || data.enableCustomerWiseRate === 'true',
        estimationStockMaintain: data.estimationStockMaintain === true || data.estimationStockMaintain === 'true',
      },
    });
  }

  async resetDatabase(type: string) {
    try {
      const truncateTransactions = async () => {
        const tables = [
          'SaleItem', 'Sale', 'SalesReturnItem', 'SalesReturn',
          'PurchaseItem', 'Purchase', 'PurchaseReturnItem', 'PurchaseReturn',
          'StockTransaction', 'Expense', 'SupplierPayment', 'CustomerReceipt',
          'RawMaterialPurchaseItem', 'RawMaterialPurchase', 'Production',
          'EstimationItem', 'Estimation'
        ];
        for (const table of tables) {
          await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        }
        await this.prisma.product.updateMany({ data: { currentStock: 0 } });
      };

      const truncateMaster = async () => {
        const tables = [
          'Product', 'Supplier', 'Customer', 'Category', 'Brand', 'Unit', 'ExpenseCategory',
          'Tax', 'RawMaterial', 'ProductRawMaterial', 'CustomerProductRate'
        ];
        for (const table of tables) {
          await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        }
      };

      if (type === 'transactions') {
        await truncateTransactions();
      } else if (type === 'master') {
        await truncateMaster();
      } else if (type === 'full') {
        await truncateTransactions();
        await truncateMaster();
      } else {
        throw new BadRequestException('Invalid reset type');
      }

      return { message: 'Database reset successfully' };
    } catch (error: any) {
      console.error('Reset DB Error:', error);
      throw new BadRequestException('Failed to reset database: ' + (error?.message || ''));
    }
  }
}
