import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';

class EstimationItemDto {
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
  amount: number;
}

export class CreateEstimationDto {
  @IsString()
  @IsOptional()
  estimationNo?: string;

  @IsDateString()
  date: string;

  @IsNumber()
  customerId: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  grandTotal: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimationItemDto)
  items: EstimationItemDto[];
}
