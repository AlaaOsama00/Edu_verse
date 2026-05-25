import { AcademicYearEnum } from "@utils/enum";
import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CreateStudentDto {

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  fullName: string;
  
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message: 'Password must be at least 8 characters long and contain both letters and numbers',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  academicId: string; // #ST-2022-1

  @IsEnum(AcademicYearEnum)
  currentYear: AcademicYearEnum; // 4 (Senior)

}