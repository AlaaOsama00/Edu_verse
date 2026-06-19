import { IsNotEmpty, IsEnum, IsMongoId, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { SemesterEnum } from '@utils/enum';

export class AddCourseDto {
@IsMongoId({ each: true }) 
  @IsNotEmpty()
  @ArrayMinSize(5) // بيجبر الفرانتد يبعت 5 مواد على الأقل
  @ArrayMaxSize(5) // (اختياري) لو عاوزة تجبريه إنهم ميزيدوش عن 5
  courseId: string[];

  @IsEnum(SemesterEnum)
  @IsNotEmpty()
  semester: SemesterEnum;
}