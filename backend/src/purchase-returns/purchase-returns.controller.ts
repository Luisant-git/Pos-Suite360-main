import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PurchaseReturnsService } from './purchase-returns.service';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';

@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private readonly purchaseReturnsService: PurchaseReturnsService) {}

  @Post()
  create(@Body() createPurchaseReturnDto: CreatePurchaseReturnDto) {
    return this.purchaseReturnsService.create(createPurchaseReturnDto);
  }

  @Get('next-code')
  getNextCode() {
    return this.purchaseReturnsService.getNextReturnNo();
  }

  @Get()
  findAll() {
    return this.purchaseReturnsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseReturnsService.findOne(+id);
  }
}
