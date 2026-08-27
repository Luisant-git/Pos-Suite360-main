import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('supplier-payments')
@UseGuards(JwtAuthGuard)
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}

  @Get('next-payment-no')
  async getNextPaymentNo() {
    return { paymentNo: await this.supplierPaymentsService.generatePaymentNo() };
  }

  @Get('balance/:id')
  async getBalance(@Param('id') id: string) {
    return this.supplierPaymentsService.getBalance(Number(id));
  }

  @Get('unpaid-bills/:id')
  async getUnpaidBills(@Param('id') id: string) {
    return this.supplierPaymentsService.getUnpaidBills(Number(id));
  }

  @Post()
  async create(@Body() createSupplierPaymentDto: any, @Request() req: any) {
    // req.user from JwtAuthGuard contains the user payload
    const userId = (req.user?.userId && req.user.userId > 0) ? req.user.userId : 1; // fallback if needed
    return this.supplierPaymentsService.create(createSupplierPaymentDto, userId);
  }

  @Get()
  async findAll() {
    return this.supplierPaymentsService.findAll();
  }
}
