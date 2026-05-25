import { IsMongoId, IsNumber, Max, Min,  IsString } from 'class-validator';


export class GradeCourseDto {
  
  @IsMongoId()
  studentId: string;

  @IsMongoId()
  courseId: string;

  // مهم عشان لو المادة أخدت في الصيف، الأدمن يحدد إنه بيدخل درجات الصيف مش الفصل العادي
  @IsString()
  semester: string

  // التحقق من الدرجات (طبقاً لقانون المادة: 20، 30، 20، 30)
  @IsNumber()
  @Min(0) @Max(20)
  midterm: number;

  @IsNumber()
  @Min(0) @Max(30)
  final: number;

  @IsNumber()
  @Min(0) @Max(20)
  practical: number;

  @IsNumber()
  @Min(0) @Max(30)
  project: number;
}

