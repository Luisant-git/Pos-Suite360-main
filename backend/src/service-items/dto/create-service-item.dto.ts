import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateServiceItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  rate?: number;

  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
