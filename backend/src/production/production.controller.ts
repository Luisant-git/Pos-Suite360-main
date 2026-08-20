import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  create(@Body() createProductionDto: CreateProductionDto) {
    return this.productionService.create(createProductionDto);
  }

  @Get()
  findAll() {
    return this.productionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(+id);
  }
}
