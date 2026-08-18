import { Injectable } from '@nestjs/common';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  create(createExpenseCategoryDto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: createExpenseCategoryDto as any,
    });
  }

  findAll() {
    return this.prisma.expenseCategory.findMany();
  }

  findOne(id: number) {
    return this.prisma.expenseCategory.findUnique({ where: { id } });
  }

  update(id: number, updateExpenseCategoryDto: UpdateExpenseCategoryDto) {
    return this.prisma.expenseCategory.update({
      where: { id },
      data: updateExpenseCategoryDto as any,
    });
  }

  remove(id: number) {
    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}
