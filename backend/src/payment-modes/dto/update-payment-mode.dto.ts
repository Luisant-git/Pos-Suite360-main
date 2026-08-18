import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentModeDto } from './create-payment-mode.dto';

export class UpdatePaymentModeDto extends PartialType(CreatePaymentModeDto) {}
