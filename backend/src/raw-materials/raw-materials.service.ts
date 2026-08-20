import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(createRawMaterialDto: CreateRawMaterialDto) {
    const existing = await this.prisma.rawMaterial.findUnique({ where: { code: createRawMaterialDto.code } });
    if (existing) {
      throw new BadRequestException('Raw Material Code already exists');
    }
    return this.prisma.rawMaterial.create({
      data: createRawMaterialDto
    });
  }

  findAll() {
    return this.prisma.rawMaterial.findMany({
      include: {
        unit: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(id: number, updateRawMaterialDto: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.update({
      where: { id },
      data: updateRawMaterialDto
    });
  }

  remove(id: number) {
    return this.prisma.rawMaterial.delete({
      where: { id }
    });
  }
}
