import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class EditGradeDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  marks: number;

}