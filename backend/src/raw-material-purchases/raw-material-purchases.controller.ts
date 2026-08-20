import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RawMaterialPurchasesService } from './raw-material-purchases.service';
import { CreateRawMaterialPurchaseDto } from './dto/create-raw-material-purchase.dto';

@Controller('raw-material-purchases')
export class RawMaterialPurchasesController {
  constructor(private readonly rawMaterialPurchasesService: RawMaterialPurchasesService) {}

  @Post()
  create(@Body() createRawMaterialPurchaseDto: CreateRawMaterialPurchaseDto) {
    return this.rawMaterialPurchasesService.create(createRawMaterialPurchaseDto);
  }

  @Get()
  findAll() {
    return this.rawMaterialPurchasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rawMaterialPurchasesService.findOne(+id);
  }
}
