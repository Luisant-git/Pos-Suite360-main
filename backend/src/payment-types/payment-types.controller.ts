import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentTypesService } from './payment-types.service';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';

@Controller('payment-types')
export class PaymentTypesController {
  constructor(private readonly paymentTypesService: PaymentTypesService) {}

  @Post()
  create(@Body() createPaymentTypeDto: CreatePaymentTypeDto) {
    return this.paymentTypesService.create(createPaymentTypeDto);
  }

  @Get()
  findAll() {
    return this.paymentTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentTypeDto: UpdatePaymentTypeDto) {
    return this.paymentTypesService.update(+id, updatePaymentTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentTypesService.remove(+id);
  }
}
