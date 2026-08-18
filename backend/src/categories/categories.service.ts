import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      include: { parent: true },
      orderBy: { id: 'desc' }
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  remove(id: number) {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
