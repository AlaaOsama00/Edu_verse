import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ConfirmEmailDto, CreateUserDto, forgotPasswordDto, ResendOtpDto, resetPasswordDto, SignInDTO } from './dto/authDto';
import { Throttle } from "@nestjs/throttler";
import { AuthService } from './auth.service';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';





@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

    @Auth(UserRolesEnum.ADMIN)
    @Post('create-account')
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.authService.createUser(createUserDto);
      }
    
    @Post('log-in')
    async signIn(@Body() signInDTO: SignInDTO) {
      const { accessToken, refreshToken } = await this.authService.signIn(signInDTO)
      return ({ accessToken ,refreshToken})
    }
    
    @Post('confirm-email')
    async confirmEmail(@Body() confirmEmailDto:ConfirmEmailDto) {
        const result = await this.authService.confirmEmail(confirmEmailDto.email,confirmEmailDto.otp)
        return {message:'Email confirmed successfully',data:result}
    }

    @Throttle({ default: { limit: 3, ttl: 60 } }) // max 3 requests per 60 seconds
    @Post('resend-otp')
    async resendOtp(@Body() resendOtpDto:ResendOtpDto) {
        await this.authService.resendOtp(resendOtpDto.email)
        return { message: 'OTP resent successfully, please check your email' }  
    }

    @Post('refresh')
      async refreshToken(@Headers('authorization') auth:string ) {
        const token = auth?.split(' ')[1]
        const result = await this.authService.refreshToken(token)
        return { message: 'Token refreshed successfully', data: result }
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: forgotPasswordDto) {
       await this.authService.forgotPassword(body.email)
       return { message: 'OTP sent to your email' }
    }

    @Post('reset-password')
    async resetPassword(@Body() resetPasswordDto: resetPasswordDto) {
       const { email, otp, newPassword } = resetPasswordDto
         await this.authService.resetPassword(email, otp, newPassword)
         return { message: 'Password reset successfully, you can login now' }
    }

}
