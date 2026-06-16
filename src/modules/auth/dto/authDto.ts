import { IsEmail, IsNotEmpty,IsString, IsStrongPassword } from 'class-validator';

export class SignInDTO {
  @IsString()
  @IsNotEmpty() // email:""
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
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

 
