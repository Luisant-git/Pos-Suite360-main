import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number) {
    // Basic validation
    if (!data.paymentNo || !data.supplierId || !data.amount || !data.paymentTypeId) {
      throw new BadRequestException('Missing required fields');
    }

    try {
      return await this.prisma.supplierPayment.create({
        data: {
          paymentNo: data.paymentNo,
          date: new Date(data.date || new Date()),
          supplierId: Number(data.supplierId),
          amount: Number(data.amount),
          paymentTypeId: Number(data.paymentTypeId),
          reference: data.reference,
          remarks: data.remarks,
          userId: userId,
        },
        include: {
          supplier: true,
          paymentType: true,
        },
      });
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw new BadRequestException('Failed to record payment. ' + (error.message || ''));
    }
  }

  async findAll() {
    return this.prisma.supplierPayment.findMany({
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
      include: {
        supplier: true,
        paymentType: true,
        paymentMode: true,
      },
    });
  }

  async getBalance(supplierId: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const creditMode = await this.prisma.paymentMode.findFirst({
      where: { name: { equals: 'Credit', mode: 'insensitive' } }
    });
    const creditModeId = creditMode?.id || -1;

    // Sum of all CREDIT purchases
    const purchases = await this.prisma.purchase.aggregate({
      where: { 
        supplierId,
        paymentModeId: creditModeId
      },
      _sum: { grandTotal: true },
    });

    // Sum of all payments
    const payments = await this.prisma.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    });

    // Sum of all purchase returns
    const purchaseReturns = await this.prisma.purchaseReturn.aggregate({
      where: { supplierId },
      _sum: { totalAmount: true },
    });

    const openingBalance = Number(supplier.openingBalance) || 0;
    const isOpeningCredit = supplier.openingBalanceType === 'Cr'; // Cr means we owe them
    const isOpeningDebit = supplier.openingBalanceType === 'Dr'; // Dr means they owe us
    
    let totalOwed = 0;
    if (isOpeningCredit) totalOwed += openingBalance;
    if (isOpeningDebit) totalOwed -= openingBalance;

    const totalPurchases = Number(purchases._sum.grandTotal) || 0;
    const totalPaid = Number(payments._sum.amount) || 0;
    const totalReturns = Number(purchaseReturns._sum.totalAmount) || 0;

    const balance = totalOwed + totalPurchases - totalPaid - totalReturns;

    return { balance, totalReturns };
  }

  async generatePaymentNo() {
    const lastPayment = await this.prisma.supplierPayment.findFirst({
      orderBy: { id: 'desc' },
    });

    let nextNo = 1;
    if (lastPayment && lastPayment.paymentNo.startsWith('PAY-')) {
      const parts = lastPayment.paymentNo.split('-');
      if (parts.length === 2) {
        nextNo = parseInt(parts[1], 10) + 1;
      }
    }

    return `PAY-${nextNo.toString().padStart(6, '0')}`;
  }

  async getUnpaidBills(supplierId: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    // 1. Get total paid
    const payments = await this.prisma.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    });
    let totalPaid = Number(payments._sum.amount) || 0;

    const purchaseReturns = await this.prisma.purchaseReturn.findMany({
      where: { supplierId },
    });
    
    const mappedReturns: Record<number, number> = {};
    let unmappedReturns = 0;
    
    purchaseReturns.forEach(pr => {
      const amt = Number(pr.totalAmount) || 0;
      if (pr.purchaseId) {
        mappedReturns[pr.purchaseId] = (mappedReturns[pr.purchaseId] || 0) + amt;
      } else {
        unmappedReturns += amt;
      }
    });

    // Both payments and unmapped returns reduce what we owe globally
    totalPaid += unmappedReturns;

    // 2. Fetch Opening Balance & Purchases (in chronological order)
    const openingBalance = Number(supplier.openingBalance) || 0;
    const isOpeningCredit = supplier.openingBalanceType === 'Cr'; // Cr means we owe them
    const isOpeningDebit = supplier.openingBalanceType === 'Dr';
    
    let bills: any[] = [];
    
    // If we owe them an opening balance, treat it as the first bill
    if (isOpeningCredit && openingBalance > 0) {
      bills.push({
        entryNo: 'Opening Balance',
        date: supplier.createdAt,
        total: openingBalance,
        returned: 0,
        received: 0,
        pending: openingBalance
      });
    } else if (isOpeningDebit && openingBalance > 0) {
      // If they owe us, this effectively increases our "totalPaid" pool
      totalPaid += openingBalance;
    }

    const creditMode = await this.prisma.paymentMode.findFirst({
      where: { name: { equals: 'Credit', mode: 'insensitive' } }
    });
    const creditModeId = creditMode?.id || -1;

    const purchases = await this.prisma.purchase.findMany({
      where: { 
        supplierId,
        paymentModeId: creditModeId
      },
      orderBy: { date: 'asc' },
    });

    for (const purchase of purchases) {
      const billTotal = Number(purchase.grandTotal) || 0;
      const returnedAmt = mappedReturns[purchase.id] || 0;
      
      bills.push({
        entryNo: purchase.invoiceNo,
        date: purchase.date,
        total: billTotal,
        returned: returnedAmt,
        received: 0,
        pending: billTotal - returnedAmt
      });
    }

    // 3. Apply FIFO
    for (const bill of bills) {
      const netBillTotal = Number((bill.total - (bill.returned || 0)).toFixed(2));
      const currentTotalPaid = Number(totalPaid.toFixed(2));
      
      if (netBillTotal <= 0) {
         bill.received = 0;
         bill.pending = 0;
         continue;
      }

      if (currentTotalPaid >= netBillTotal) {
        // Fully paid
        bill.received = netBillTotal;
        bill.pending = 0;
        totalPaid -= netBillTotal;
      } else if (currentTotalPaid > 0 && currentTotalPaid < netBillTotal) {
        // Partially paid
        bill.received = currentTotalPaid;
        bill.pending = Number((netBillTotal - currentTotalPaid).toFixed(2));
        totalPaid = 0;
      } else {
        // Completely unpaid
        bill.received = 0;
        bill.pending = netBillTotal;
      }
    }

    return bills;
  }
}
