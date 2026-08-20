import { IsInt, IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateProductionDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  workName: string;

  @IsInt()
  rawMaterialId: number;

  @IsInt()
  intakeQuantity: number;

  @IsInt()
  finishedProductId: number;

  @IsInt()
  outcomeQuantity: number;
}
