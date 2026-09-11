import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';

class ServiceSaleItemDto {
  @IsOptional()
  @IsNumber()
  serviceItemId?: number;

  @IsString()
  serviceName: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  rate: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  amount: number;
}

export class CreateServiceSaleDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsNumber()
  paymentModeId: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  grandTotal: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSaleItemDto)
  items: ServiceSaleItemDto[];
}
