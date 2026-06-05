import {  IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsString, Min } from 'class-validator';
import { AssessmentTypeEnum } from '@utils/enum';

export class CreateAssignmentDto {

  @IsNotEmpty()
  @IsObject()
  courseId: string;

 @IsEnum([AssessmentTypeEnum.ASSIGNMENT1, AssessmentTypeEnum.ASSIGNMENT2])
  @IsNotEmpty()
  type: AssessmentTypeEnum;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  maxMark: number;

  @IsDateString()
  @IsNotEmpty()
  deadline: string; // التاريخ اللي هيتقفل عنده
}