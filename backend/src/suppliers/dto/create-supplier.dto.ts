import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  openingBalanceType?: string;

  @IsString()
  @IsOptional()
  accountNo?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;
}
