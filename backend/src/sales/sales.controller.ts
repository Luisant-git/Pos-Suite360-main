import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.salesService.create(createSaleDto, userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.salesService.findAll(query);
  }

  @Get('next-invoice-no')
  async getNextInvoiceNo() {
    return { invoiceNo: await this.salesService.getNextInvoiceNo() };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }
}
