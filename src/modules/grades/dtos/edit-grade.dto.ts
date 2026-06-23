import { IsNumber } from 'class-validator';

export class EditGradeDto {
  
  @IsNumber()
  marks: number;

}