// src/modules/grade/dto/bulk-grade.dto.ts
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class SingleStudentGrade {
    @IsString()
    @IsNotEmpty()
    academicId: string; // رقم الجلوس

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    marks: number;
}

export class BulkGradeDto {
    @IsNotEmpty()
    @IsString()
    courseId: string; // هحطها في الـ Param مش Body، بس عشان الـ Swagger نظيف

    @IsNotEmpty()
    @IsString()
    assessmentId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    students: SingleStudentGrade[];
}