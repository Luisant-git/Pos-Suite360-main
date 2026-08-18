import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}
