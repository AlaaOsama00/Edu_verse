import { AcademicYearEnum, SemesterEnum } from '@utils/enum';
import { IsString, IsNumber, IsEnum, Min, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateCourseDto {
  
  @IsNotEmpty()
  @IsString()
  name: string;
  
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  description:string
  
  @IsNumber()
  @Min(1)
  creditHours: number;
  
  @IsNotEmpty()
  @IsEnum(AcademicYearEnum)
  academicYear: AcademicYearEnum;

  @IsNotEmpty()
  @IsEnum(SemesterEnum)
  semester: SemesterEnum;
  
  @IsNotEmpty()
  @IsString()
  professorId: string; //Saved on Studyplan not course 

  @IsOptional()
  @IsBoolean()
  isTraining: boolean; 

}