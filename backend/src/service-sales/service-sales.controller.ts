import { Controller, Get, Post, Body, Param, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { ServiceSalesService } from './service-sales.service';
import { CreateServiceSaleDto } from './dto/create-service-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('service-sales')
export class ServiceSalesController {
  constructor(private readonly serviceSalesService: ServiceSalesService) {}

  @Get('next-invoice-no')
  getNextInvoiceNo() {
    return this.serviceSalesService.getNextInvoiceNo();
  }

  @Get()
  findAll(@Query() query: any) {
    return this.serviceSalesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceSalesService.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateServiceSaleDto, @Request() req: any) {
    return this.serviceSalesService.create(dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceSalesService.remove(+id);
  }
}
