import { IsDateString, IsEnum,IsNotEmpty, IsString } from 'class-validator';
import { AssessmentTypeEnum } from '@utils/enum';

export class CreateAssignmentDto {

  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsEnum([AssessmentTypeEnum.ASSIGNMENT1, AssessmentTypeEnum.ASSIGNMENT2])
  @IsNotEmpty()
  type: AssessmentTypeEnum;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  deadline: Date;  
  }