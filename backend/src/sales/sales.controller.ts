import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query, Delete, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto, @Request() req: any) {
    const userId = (req.user?.userId && req.user.userId > 0) ? req.user.userId : 1;
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
    if (isNaN(+id)) throw new BadRequestException('Invalid ID');
    return this.salesService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto, @Request() req: any) {
    if (isNaN(+id)) throw new BadRequestException('Invalid ID');
    const userId = (req.user?.userId && req.user.userId > 0) ? req.user.userId : 1;
    return this.salesService.update(+id, updateSaleDto, userId);
  }
}
