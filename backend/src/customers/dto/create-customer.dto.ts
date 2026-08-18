import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string; // Billing Address

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @IsString()
  @IsOptional()
  openingBalanceType?: string;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsNumber()
  @IsOptional()
  creditDays?: number;
}
