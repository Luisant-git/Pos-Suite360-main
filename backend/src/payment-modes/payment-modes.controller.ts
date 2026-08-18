import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentModesService } from './payment-modes.service';
import { CreatePaymentModeDto } from './dto/create-payment-mode.dto';
import { UpdatePaymentModeDto } from './dto/update-payment-mode.dto';

@Controller('payment-modes')
export class PaymentModesController {
  constructor(private readonly paymentModesService: PaymentModesService) {}

  @Post()
  create(@Body() createPaymentModeDto: CreatePaymentModeDto) {
    return this.paymentModesService.create(createPaymentModeDto);
  }

  @Get()
  findAll() {
    return this.paymentModesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentModesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentModeDto: UpdatePaymentModeDto) {
    return this.paymentModesService.update(+id, updatePaymentModeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentModesService.remove(+id);
  }
}
