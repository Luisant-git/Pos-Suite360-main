import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesReturnItemDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsNumber()
  @IsNotEmpty()
  returnQty: number;

  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CreateSalesReturnDto {
  @IsString()
  @IsNotEmpty()
  returnNo: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsOptional()
  saleId?: number;

  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items: SalesReturnItemDto[];
}
