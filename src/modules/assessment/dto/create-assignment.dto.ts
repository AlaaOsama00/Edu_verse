import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { AssessmentTypeEnum } from '@utils/enum';

export class CreateAssignmentDto {

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsEnum([AssessmentTypeEnum.ASSIGNMENT1, AssessmentTypeEnum.ASSIGNMENT2])
  @IsNotEmpty()
  type: AssessmentTypeEnum;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  deadline: string; // التاريخ اللي هيتقفل عنده
}