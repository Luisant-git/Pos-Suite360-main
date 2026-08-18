import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsInt()
  @IsOptional()
  categoryId?: number;

  @IsInt()
  @IsOptional()
  brandId?: number;

  @IsInt()
  unitId: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchaseRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sellingRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mrp?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxPercent?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  wholesaleRate?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  reorderLevel?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  currentStock?: number;
}
