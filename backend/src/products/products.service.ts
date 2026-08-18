import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async getNextCode() {
    const lastProduct = await this.prisma.product.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true }
    });
    let nextNumber = 1;
    if (lastProduct && lastProduct.code) {
      const match = lastProduct.code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }
    return { code: `P${nextNumber.toString().padStart(6, '0')}` };
  }

  findAll(query?: any) {
    const where: any = {};
    if (query?.categoryId) {
      where.categoryId = Number(query.categoryId);
    }
    if (query?.brandId) {
      where.brandId = Number(query.brandId);
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  remove(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
