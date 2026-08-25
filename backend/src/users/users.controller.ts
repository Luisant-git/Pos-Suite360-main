import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcrypt';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    const { username, password, name, roleId } = body;
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    body.password = hashedPassword;
    return this.usersService.createUser(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }
    return this.usersService.updateUser(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(+id);
  }
}
