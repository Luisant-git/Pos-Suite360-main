import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto) {
    const { rawMaterials, ...productData } = createProductDto;
    
    return this.prisma.product.create({
      data: {
        ...productData,
        rawMaterials: rawMaterials && rawMaterials.length > 0 ? {
          create: rawMaterials.map(rmId => ({
            rawMaterialId: rmId
          }))
        } : undefined
      },
      include: {
        rawMaterials: true
      }
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
    if (query?.isManufacturingProduct !== undefined) {
      where.isManufacturingProduct = query.isManufacturingProduct === 'true' || query.isManufacturingProduct === true;
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
        rawMaterials: {
          include: {
            rawMaterial: true
          }
        }
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
        rawMaterials: {
          include: {
            rawMaterial: true
          }
        }
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { rawMaterials, ...productData } = updateProductDto as any;

    // If rawMaterials is provided, we need to delete existing and recreate
    if (rawMaterials !== undefined) {
      await this.prisma.productRawMaterial.deleteMany({
        where: { productId: id }
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(rawMaterials !== undefined ? {
          rawMaterials: {
            create: rawMaterials.map((rmId: number) => ({
              rawMaterialId: rmId
            }))
          }
        } : {})
      },
      include: {
        rawMaterials: true
      }
    });
  }

  async remove(id: number) {
    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      if (error?.code === 'P2003') {
        throw new BadRequestException('Cannot delete product because it is already used in transactions (purchases or sales).');
      }
      throw error;
    }
  }
}
