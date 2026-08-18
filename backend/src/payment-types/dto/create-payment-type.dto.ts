import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePaymentTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
