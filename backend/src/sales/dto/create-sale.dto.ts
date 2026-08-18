import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';

class SaleItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

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

export class CreateSaleDto {
  @IsString()
  invoiceNo: string;

  @IsDateString()
  date: string;

  @IsNumber()
  customerId: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
