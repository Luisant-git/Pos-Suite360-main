import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  expenseCategoryId: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  paymentModeId: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
