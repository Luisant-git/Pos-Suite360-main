import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: any) {
    const where: any = {};
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    return this.prisma.serviceItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getNextCode() {
    const count = await this.prisma.serviceItem.count();
    return { code: `SVC-${String(count + 1).padStart(4, '0')}` };
  }

  async findOne(id: number) {
    const item = await this.prisma.serviceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Service item #${id} not found`);
    return item;
  }

  async create(dto: CreateServiceItemDto) {
    // Auto-generate code if not provided
    let code = dto.code;
    if (!code) {
      const count = await this.prisma.serviceItem.count();
      code = `SVC-${String(count + 1).padStart(4, '0')}`;
    }
    try {
      return await this.prisma.serviceItem.create({
        data: {
          name: dto.name,
          code,
          description: dto.description,
          rate: dto.rate ?? 0,
          taxPercent: dto.taxPercent ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(`Service item code "${code}" already exists`);
      }
      throw e;
    }
  }

  async update(id: number, dto: Partial<CreateServiceItemDto>) {
    await this.findOne(id);
    return this.prisma.serviceItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.taxPercent !== undefined && { taxPercent: dto.taxPercent }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.serviceItem.delete({ where: { id } });
  }
}
