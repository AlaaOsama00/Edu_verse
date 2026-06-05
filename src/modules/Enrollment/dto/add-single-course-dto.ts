import { IsNotEmpty, IsEnum, IsMongoId } from 'class-validator';
import { SemesterEnum } from '@utils/enum';

export class AddSingleCourseDto {
  @IsMongoId()
  @IsNotEmpty()
  courseId: string;

  @IsEnum(SemesterEnum)
  @IsNotEmpty()
  semester: SemesterEnum;
}