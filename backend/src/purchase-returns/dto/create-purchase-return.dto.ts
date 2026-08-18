import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseReturnItemDto {
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

export class CreatePurchaseReturnDto {
  @IsString()
  @IsNotEmpty()
  returnNo: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsOptional()
  purchaseId?: number;

  @IsNumber()
  @IsNotEmpty()
  supplierId: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items: PurchaseReturnItemDto[];
}
