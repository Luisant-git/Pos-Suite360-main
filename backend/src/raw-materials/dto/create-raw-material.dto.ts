import { IsString, IsNotEmpty, IsInt, Min, IsNumber, IsOptional } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsInt()
  unitId: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  currentStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchaseRate?: number;
}
