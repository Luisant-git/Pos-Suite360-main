import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { CustomerReceiptsService } from './customer-receipts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customer-receipts')
@UseGuards(JwtAuthGuard)
export class CustomerReceiptsController {
  constructor(private readonly customerReceiptsService: CustomerReceiptsService) {}

  @Get('next-receipt-no')
  async getNextReceiptNo() {
    return { receiptNo: await this.customerReceiptsService.generateReceiptNo() };
  }

  @Get('balance/:id')
  async getBalance(@Param('id') id: string) {
    return this.customerReceiptsService.getBalance(Number(id));
  }

  @Get('unpaid-bills/:id')
  async getUnpaidBills(@Param('id') id: string) {
    return this.customerReceiptsService.getUnpaidBills(Number(id));
  }

  @Post()
  async create(@Body() createCustomerReceiptDto: any, @Request() req: any) {
    const userId = (req.user?.userId && req.user.userId > 0) ? req.user.userId : 1;
    return this.customerReceiptsService.create(createCustomerReceiptDto, userId);
  }

  @Get()
  async findAll() {
    return this.customerReceiptsService.findAll();
  }
}
