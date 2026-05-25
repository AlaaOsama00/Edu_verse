import { AcademicYearEnum, UserRolesEnum } from '@utils/enum';
import { IsEmail, IsEnum, IsNotEmpty,IsNumber,IsString, IsStrongPassword, Max, Min, MinLength, ValidateIf } from 'class-validator';

export class SignInDTO {
  @IsString()
  @IsNotEmpty() // email:""
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

 export class CreateUserDto {
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
   // @Matches(...)  TO DO: Add regex for password complexity
   password: string;

   @IsEnum(UserRolesEnum)
   @IsNotEmpty()
   role: UserRolesEnum; 

     // دي بتفعّل لو الـ Role اللي اختاره الطالب
  @ValidateIf((o) => o.role === UserRolesEnum.STUDENT|| o.role === UserRolesEnum.PROFESSOR)
  @IsString()
  @IsNotEmpty()
  academicId?: string;

  @ValidateIf((o) => o.role === UserRolesEnum.STUDENT)
  @IsEnum(AcademicYearEnum)
  @IsNotEmpty()
  currentYear?: AcademicYearEnum; 


 }

export class ConfirmEmailDto {
    @IsString()
    @IsEmail()
    email:string;

    @IsString()
    @IsNotEmpty()
    otp:string;
}
  
export class ResendOtpDto {
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email:string;
}

export class forgotPasswordDto {
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email:string;
}   

export class resetPasswordDto {
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email:string;
    
    @IsString()
    @IsNotEmpty()
    otp:string;

    @IsStrongPassword()
    @IsNotEmpty()
    newPassword:string;
}