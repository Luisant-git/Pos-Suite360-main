import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(username: string, pass: string): Promise<User> {
    let role = await this.prisma.role.findFirst();
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'Admin', permissions: ['ALL'] }
      });
    }

    return this.prisma.user.upsert({
      where: { username },
      update: {
        password: pass,
        roleId: role.id,
      },
      create: {
        username,
        password: pass,
        name: username,
        roleId: role.id,
      },
    });
  }

  async updatePassword(userId: number, hash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }
}
