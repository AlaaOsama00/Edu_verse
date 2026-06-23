// src/modules/grade/dto/bulk-grade.dto.ts
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BulkGradeDto {

    @IsString()
    @IsNotEmpty()
    studentAcademicId:string
    
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    @Max(40)
    practical: number; // رقم الجلوس

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    @Max(20)
    midterm: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    @Max(20)
    final: number;
}

// export class BulkGradeDto {

//     @IsArray()
//     @ArrayMinSize(1)
//     @ValidateNested({ each: true })
//     studentsGrade: SingleStudentGrade[];
// }