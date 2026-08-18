import { IsString, IsNotEmpty } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
