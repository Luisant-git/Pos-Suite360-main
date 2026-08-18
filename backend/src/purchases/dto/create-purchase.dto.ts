import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';

class PurchaseItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  rate: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  wRate?: number;

  @IsNumber()
  @IsOptional()
  sRate?: number;

  @IsNumber()
  @IsOptional()
  mrp?: number;
}

export class CreatePurchaseDto {
  @IsString()
  invoiceNo: string;

  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  supplierInvoiceNo?: string;

  @IsNumber()
  supplierId: number;

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
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
