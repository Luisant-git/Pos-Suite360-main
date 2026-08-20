import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RawMaterialPurchaseItemDto {
  @IsInt()
  rawMaterialId: number;

  @IsNumber()
  widthMm: number;

  @IsNumber()
  lengthM: number;

  @IsNumber()
  sqM: number;

  @IsInt()
  quantity: number;

  @IsNumber()
  price: number;

  @IsNumber()
  amount: number;
}

export class CreateRawMaterialPurchaseDto {
  @IsString()
  @IsNotEmpty()
  invoiceNo: string;

  @IsDateString()
  date: string;

  @IsInt()
  supplierId: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  tax: number;

  @IsNumber()
  grandTotal: number;

  @IsArray()
  items: RawMaterialPurchaseItemDto[];
}
