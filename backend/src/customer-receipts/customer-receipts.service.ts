import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerReceiptsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number) {
    if (!data.receiptNo || !data.customerId || !data.amount || !data.paymentTypeId) {
      throw new BadRequestException('Missing required fields');
    }

    try {
      return await this.prisma.customerReceipt.create({
        data: {
          receiptNo: data.receiptNo,
          date: new Date(data.date || new Date()),
          customerId: Number(data.customerId),
          amount: Number(data.amount),
          paymentTypeId: Number(data.paymentTypeId),
          reference: data.reference,
          remarks: data.remarks,
          userId: userId,
        },
        include: {
          customer: true,
          paymentType: true,
        },
      });
    } catch (error) {
      console.error('Error creating customer receipt:', error);
      throw new BadRequestException('Failed to record receipt. ' + (error.message || ''));
    }
  }

  async findAll() {
    return this.prisma.customerReceipt.findMany({
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
      include: {
        customer: true,
        paymentType: true,
        paymentMode: true,
      },
    });
  }

  async getBalance(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // Sum of all CREDIT sales
    const sales = await this.prisma.sale.aggregate({
      where: { 
        customerId,
        paymentModeId: 4 // Hardcoded Credit ID
      },
      _sum: { grandTotal: true },
    });

    // Sum of all receipts
    const receipts = await this.prisma.customerReceipt.aggregate({
      where: { customerId },
      _sum: { amount: true },
    });

    // Sum of all sales returns
    const salesReturns = await this.prisma.salesReturn.aggregate({
      where: { customerId },
      _sum: { totalAmount: true },
    });
    const totalReturns = Number(salesReturns._sum.totalAmount) || 0;

    const openingBalance = Number(customer.openingBalance) || 0;
    const isOpeningCredit = customer.openingBalanceType === 'Cr'; // Cr means we owe them
    const isOpeningDebit = customer.openingBalanceType === 'Dr'; // Dr means they owe us
    
    let totalOwed = 0;
    if (isOpeningDebit) totalOwed += openingBalance;
    if (isOpeningCredit) totalOwed -= openingBalance;

    const totalSales = Number(sales._sum.grandTotal) || 0;
    const totalCollected = Number(receipts._sum.amount) || 0;

    const balance = totalOwed + totalSales - totalCollected - totalReturns;

    return { balance, totalReturns };
  }

  async generateReceiptNo() {
    const lastReceipt = await this.prisma.customerReceipt.findFirst({
      orderBy: { id: 'desc' },
    });

    let nextNo = 1;
    if (lastReceipt && lastReceipt.receiptNo.startsWith('REC-')) {
      const parts = lastReceipt.receiptNo.split('-');
      if (parts.length === 2) {
        nextNo = parseInt(parts[1], 10) + 1;
      }
    }

    return `REC-${nextNo.toString().padStart(6, '0')}`;
  }

  async getUnpaidBills(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // 1. Get total collected
    const receipts = await this.prisma.customerReceipt.aggregate({
      where: { customerId },
      _sum: { amount: true },
    });
    let totalCollected = Number(receipts._sum.amount) || 0;

    const salesReturns = await this.prisma.salesReturn.findMany({
      where: { customerId },
    });
    
    const mappedReturns: Record<number, number> = {};
    let unmappedReturns = 0;
    
    salesReturns.forEach(sr => {
      const amt = Number(sr.totalAmount) || 0;
      if (sr.saleId) {
        mappedReturns[sr.saleId] = (mappedReturns[sr.saleId] || 0) + amt;
      } else {
        unmappedReturns += amt;
      }
    });

    // Both collected payments and unmapped returns reduce what the customer owes us globally
    totalCollected += unmappedReturns;

    // 2. Fetch Opening Balance & Sales (in chronological order)
    const openingBalance = Number(customer.openingBalance) || 0;
    const isOpeningDebit = customer.openingBalanceType === 'Dr'; // Dr means they owe us
    const isOpeningCredit = customer.openingBalanceType === 'Cr';
    
    let bills: any[] = [];
    
    // If they owe us an opening balance, treat it as the first bill
    if (isOpeningDebit && openingBalance > 0) {
      bills.push({
        entryNo: 'Opening Balance',
        date: customer.createdAt, // Or a specific OB date if available
        total: openingBalance,
        returned: 0,
        received: 0,
        pending: openingBalance
      });
    } else if (isOpeningCredit && openingBalance > 0) {
      // If we owe them, this effectively increases their "totalCollected" pool
      totalCollected += openingBalance;
    }

    const sales = await this.prisma.sale.findMany({
      where: { 
        customerId,
        paymentModeId: 4 // Hardcoded Credit ID
      },
      orderBy: { date: 'asc' },
    });

    for (const sale of sales) {
      const billTotal = Number(sale.grandTotal) || 0;
      const returnedAmt = mappedReturns[sale.id] || 0;
      
      bills.push({
        entryNo: sale.invoiceNo,
        date: sale.date,
        total: billTotal,
        returned: returnedAmt,
        received: 0,
        pending: billTotal - returnedAmt
      });
    }

    // 3. Apply FIFO
    for (const bill of bills) {
      const netBillTotal = Number((bill.total - (bill.returned || 0)).toFixed(2));
      const currentTotalCollected = Number(totalCollected.toFixed(2));
      
      if (netBillTotal <= 0) {
         bill.received = 0;
         bill.pending = 0;
         continue;
      }

      if (currentTotalCollected >= netBillTotal) {
        // Fully paid
        bill.received = netBillTotal;
        bill.pending = 0;
        totalCollected -= netBillTotal;
      } else if (currentTotalCollected > 0 && currentTotalCollected < netBillTotal) {
        // Partially paid
        bill.received = currentTotalCollected;
        bill.pending = Number((netBillTotal - currentTotalCollected).toFixed(2));
        totalCollected = 0;
      } else {
        // Completely unpaid
        bill.received = 0;
        bill.pending = netBillTotal;
      }
    }

    return bills;
  }
}
