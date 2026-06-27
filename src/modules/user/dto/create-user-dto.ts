import { UserRolesEnum, AcademicYearEnum } from "@utils/enum";
import { IsString, IsNotEmpty, IsEmail, MinLength, IsEnum, ValidateIf } from "class-validator";

 export class CreateUserDto {
   @ValidateIf((o) => o.role != UserRolesEnum.STUDENT)
   @IsString()
   @IsNotEmpty()
   @IsEmail()
   email?: string;
  

   @IsString()
   @IsNotEmpty()
   @MinLength(3)
   fullName: string;

   @IsString()
   @IsNotEmpty()
   password: string;

   @IsEnum(UserRolesEnum)
   @IsNotEmpty()
   role: UserRolesEnum; 

     // دي بتفعّل لو الـ Role اللي اختاره الطالب
  @ValidateIf((o) => o.role === UserRolesEnum.STUDENT)
  @IsString()
  @IsNotEmpty()
  academicId?: string;

  @ValidateIf((o) => o.role === UserRolesEnum.STUDENT)
  @IsEnum(AcademicYearEnum)
  @IsNotEmpty()
  currentYear?: AcademicYearEnum; 


 }