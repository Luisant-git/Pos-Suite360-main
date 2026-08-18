import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';

@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Post()
  create(@Body() createSalesReturnDto: CreateSalesReturnDto) {
    return this.salesReturnsService.create(createSalesReturnDto);
  }

  @Get('next-code')
  getNextCode() {
    return this.salesReturnsService.getNextReturnNo();
  }

  @Get()
  findAll() {
    return this.salesReturnsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(+id);
  }
}
