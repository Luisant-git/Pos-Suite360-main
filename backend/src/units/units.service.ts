import { Injectable } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  create(createUnitDto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: createUnitDto,
    });
  }

  findAll() {
    return this.prisma.unit.findMany({
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.unit.findUnique({
      where: { id },
    });
  }

  update(id: number, updateUnitDto: UpdateUnitDto) {
    return this.prisma.unit.update({
      where: { id },
      data: updateUnitDto,
    });
  }

  remove(id: number) {
    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
