import { Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  create(createExpenseDto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        date: new Date(createExpenseDto.date),
        expenseCategoryId: createExpenseDto.expenseCategoryId,
        amount: createExpenseDto.amount,
        paymentModeId: createExpenseDto.paymentModeId,
        notes: createExpenseDto.notes,
      },
    });
  }

  findAll(query?: any) {
    return this.prisma.expense.findMany({
      include: {
        category: true,
        paymentMode: true,
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
    });
  }

  findOne(id: number) {
    return this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        paymentMode: true,
      },
    });
  }
}
