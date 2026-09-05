import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfitLoss(fromDateStr?: string, toDateStr?: string) {
    const whereDate: any = {};
    if (fromDateStr || toDateStr) {
      whereDate.date = {};
      if (fromDateStr) {
        whereDate.date.gte = new Date(fromDateStr);
      }
      if (toDateStr) {
        const toDate = new Date(toDateStr);
        toDate.setHours(23, 59, 59, 999);
        whereDate.date.lte = toDate;
      }
    }

    // 1. Gross Sales Revenue
    const sales = await this.prisma.sale.aggregate({
      where: whereDate,
      _sum: { grandTotal: true },
    });
    const grossSales = Number(sales._sum.grandTotal || 0);

    // 2. Sales Returns
    const salesReturns = await this.prisma.salesReturn.aggregate({
      where: whereDate,
      _sum: { totalAmount: true },
    });
    const totalSalesReturns = Number(salesReturns._sum.totalAmount || 0);

    const netOperatingRevenue = grossSales - totalSalesReturns;

    // 3. Gross Purchases (Used as COGS here)
    const purchases = await this.prisma.purchase.aggregate({
      where: whereDate,
      _sum: { grandTotal: true },
    });
    const grossPurchases = Number(purchases._sum.grandTotal || 0);

    // 4. Purchase Returns
    const purchaseReturns = await this.prisma.purchaseReturn.aggregate({
      where: whereDate,
      _sum: { totalAmount: true },
    });
    const totalPurchaseReturns = Number(purchaseReturns._sum.totalAmount || 0);

    const netCogs = grossPurchases - totalPurchaseReturns;

    const grossProfit = netOperatingRevenue - netCogs;

    // 5. Operating Expenses (Itemized by Category)
    const expenses = await this.prisma.expense.findMany({
      where: whereDate,
      include: { category: true },
    });

    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;

    for (const exp of expenses) {
      const amount = Number(exp.amount || 0);
      totalExpenses += amount;
      const catName = exp.category?.name || 'Uncategorized';
      if (!expensesByCategory[catName]) {
        expensesByCategory[catName] = 0;
      }
      expensesByCategory[catName] += amount;
    }

    const itemizedExpenses = Object.keys(expensesByCategory).map(name => ({
      name,
      amount: expensesByCategory[name],
    }));

    const netProfit = grossProfit - totalExpenses;

    return {
      grossSales,
      totalSalesReturns,
      netOperatingRevenue,
      grossPurchases,
      totalPurchaseReturns,
      netCogs,
      grossProfit,
      itemizedExpenses,
      totalExpenses,
      netProfit,
    };
  }

  async getBatchProfitAndLoss(workName?: string, productId?: number) {
    const whereClause: any = {};
    if (workName) {
      whereClause.workName = workName;
    }
    if (productId) {
      whereClause.finishedProductId = Number(productId);
    }

    const productions = await this.prisma.production.findMany({
      where: whereClause,
      include: {
        rawMaterial: {
          include: { rawMaterialPurchaseItems: true }
        },
        finishedProduct: true,
      },
    });

    let totalCost = 0;
    let totalRevenue = 0;

    const materialsUsed: Record<string, { quantity: number; cost: number; name: string }> = {};

    let totalProducedQty = 0;
    let totalTheoreticalYield = 0;

    productions.forEach(prod => {
      const intakeQty = Number(prod.intakeQuantity || 0);
      const purchaseRate = Number(prod.rawMaterial?.purchaseRate || 0);
      const cost = intakeQty * purchaseRate;
      
      const outcomeQty = Number(prod.outcomeQuantity || 0);
      const sellingRate = Number(prod.finishedProduct?.sellingRate || 0);
      const revenue = outcomeQty * sellingRate;

      totalCost += cost;
      totalRevenue += revenue;
      totalProducedQty += outcomeQty;

      // theoretical yield calculation
      const rmSqM = Number(prod.rawMaterial?.rawMaterialPurchaseItems?.[0]?.sqM || 0);
      const productSqM = Number(prod.finishedProduct?.sqM || 0);
      const rawSqMUsed = intakeQty * rmSqM;
      if (productSqM > 0) {
        totalTheoreticalYield += (rawSqMUsed / productSqM);
      }

      const matName = prod.rawMaterial?.name || 'Unknown';
      if (!materialsUsed[matName]) {
        materialsUsed[matName] = { quantity: 0, cost: 0, name: matName };
      }
      materialsUsed[matName].quantity += intakeQty;
      materialsUsed[matName].cost += cost;
    });

    const profit = totalRevenue - totalCost;
    
    const wastageQty = totalTheoreticalYield > 0 ? Math.max(0, totalTheoreticalYield - totalProducedQty) : 0;
    const wastagePercentage = totalTheoreticalYield > 0 ? (wastageQty / totalTheoreticalYield) * 100 : 0;

    return {
      workName,
      totalCost,
      totalRevenue,
      profit,
      totalProducedQty,
      wastageQty,
      wastagePercentage,
      materialsUsed: Object.values(materialsUsed),
    };
  }
}
