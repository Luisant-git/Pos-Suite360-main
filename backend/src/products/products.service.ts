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

  async importProducts(rows: any[], isManufacturingProduct = false) {
    const units = await this.prisma.unit.findMany();
    const categories = await this.prisma.category.findMany();
    const brands = await this.prisma.brand.findMany();

    const findUnit = (name: string) => units.find(u => u.name.toLowerCase() === (name || '').toLowerCase());
    const findCategory = (name: string) => categories.find(c => c.name.toLowerCase() === (name || '').toLowerCase());
    const findBrand = (name: string) => brands.find(b => b.name.toLowerCase() === (name || '').toLowerCase());

    let created = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      const name = (row['Product Name'] || row['name'] || '').toString().trim();
      if (!name) { skipped++; continue; }

      const unitName = (row['Unit'] || row['unit'] || 'Nos').toString().trim();
      let unit = findUnit(unitName);
      if (!unit) {
        unit = await this.prisma.unit.create({ data: { name: unitName, shortCode: unitName.substring(0, 5) } });
        units.push(unit);
      }

      const categoryName = (row['Category'] || row['category'] || '').toString().trim();
      let categoryId: number | undefined;
      if (categoryName) {
        let cat = findCategory(categoryName);
        if (!cat) {
          cat = await this.prisma.category.create({ data: { name: categoryName } });
          categories.push(cat);
        }
        categoryId = cat.id;
      }

      const brandName = (row['Brand'] || row['brand'] || '').toString().trim();
      let brandId: number | undefined;
      if (brandName) {
        let br = findBrand(brandName);
        if (!br) {
          br = await this.prisma.brand.create({ data: { name: brandName } });
          brands.push(br);
        }
        brandId = br.id;
      }

      const data: any = {
        unitId: unit.id,
        categoryId: categoryId || null,
        brandId: brandId || null,
        purchaseRate: parseFloat(row['Purchase Rate'] || row['purchaseRate'] || 0) || 0,
        sellingRate: parseFloat(row['Sale Rate'] || row['sellingRate'] || 0) || 0,
        wholesaleRate: parseFloat(row['Wholesale Rate'] || row['wholesaleRate'] || 0) || 0,
        mrp: parseFloat(row['MRP'] || row['mrp'] || 0) || 0,
        currentStock: parseInt(row['Opening Stock'] || row['currentStock'] || 0) || 0,
        minStock: parseInt(row['Min Stock'] || row['minStock'] || 0) || 0,
        reorderLevel: parseInt(row['Reorder Level'] || row['reorderLevel'] || 0) || 0,
        taxPercent: parseFloat(row['Tax %'] || row['taxPercent'] || 0) || 0,
        hsnCode: (row['HSN Code'] || row['hsnCode'] || '').toString().trim() || null,
        isManufacturingProduct,
      };

      const existing = await this.prisma.product.findFirst({ where: { name } });
      if (existing) {
        await this.prisma.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        // Generate next code
        const last = await this.prisma.product.findFirst({ orderBy: { id: 'desc' }, select: { code: true } });
        let nextNum = 1;
        if (last?.code) { const m = last.code.match(/\d+$/); if (m) nextNum = parseInt(m[0]) + 1; }
        const code = `P${nextNum.toString().padStart(6, '0')}`;
        await this.prisma.product.create({ data: { ...data, name, code } });
        created++;
      }
    }

    return { created, updated, skipped, total: rows.length };
  }
}
