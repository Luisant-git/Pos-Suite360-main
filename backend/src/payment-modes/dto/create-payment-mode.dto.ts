import { IsString, IsOptional } from 'class-validator';

export class CreatePaymentModeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
