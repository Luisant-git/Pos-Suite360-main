import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.serviceItemsService.findAll(query);
  }

  @Get('next-code')
  getNextCode() {
    return this.serviceItemsService.getNextCode();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceItemsService.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateServiceItemDto) {
    return this.serviceItemsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateServiceItemDto>) {
    return this.serviceItemsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceItemsService.remove(+id);
  }
}
