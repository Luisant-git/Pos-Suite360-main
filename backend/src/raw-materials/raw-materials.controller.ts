import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';

@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Post()
  create(@Body() createRawMaterialDto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(createRawMaterialDto);
  }

  @Get()
  findAll() {
    return this.rawMaterialsService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRawMaterialDto: CreateRawMaterialDto) {
    return this.rawMaterialsService.update(+id, updateRawMaterialDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rawMaterialsService.remove(+id);
  }
}
