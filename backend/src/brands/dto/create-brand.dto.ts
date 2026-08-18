import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}
