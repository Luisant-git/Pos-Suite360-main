import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: { outcomeQuantity: number }) {
    return this.productionService.update(+id, updateData);
  }
}
