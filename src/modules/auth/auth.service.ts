import { UserRepository } from '@models/user/user.repository';
import { Injectable,InternalServerErrorException, UnauthorizedException, NotFoundException, BadRequestException} from '@nestjs/common';
import { compare, generateOTP, hashPassword } from 'src/common/utiles/helpers';
import { sendEmail } from 'src/common/utiles/email.utils';
import { TokenService } from 'src/common/service/token.service';
import { Types } from 'mongoose';
import { StatusEnum, UserRolesEnum } from '@utils/enum';
import { StudentService } from '../student/student.service';
import { CreateUserDto, SignInDTO } from './dto/authDto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly studentService: StudentService
  ) {}

  async createUser(createUserDto: CreateUserDto ) {

  
     if(createUserDto.role === UserRolesEnum.ADMIN){
        const existingAdmin = await this.userRepository.findOne({ filter: { role: UserRolesEnum.ADMIN } });
        if (existingAdmin) {
          throw new BadRequestException('An admin account already exists. Only one admin is allowed.');
        }
        return this.userRepository.create({
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          password: await hashPassword(createUserDto.password),
          role: createUserDto.role
        });
      }

     switch (createUserDto.role) {
      
      case UserRolesEnum.STUDENT:
         if (!createUserDto.currentYear|| !createUserDto.academicId) {
          throw new BadRequestException('currentYear and academicId are required ');
        }
        return this.studentService.createStudent({
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          password: createUserDto.password, // الباسورد هنا مشفر جاهز من الـ Auth Service
          academicId: createUserDto.academicId,
          currentYear: createUserDto.currentYear, // <--- بدل الـ 1 الثابت، حطينا المتغير اللي جاي من الـ DTO
        });

      case UserRolesEnum.PROFESSOR:
        throw new BadRequestException('Professor registration is not implemented yet.');
 
      default:
        throw new BadRequestException('Invalid role selected.');
    }


  }

  async signIn(signInDTO: SignInDTO) {

  const user = await this.userRepository.findByEmail(signInDTO.email);
  if (!user || !(await compare(signInDTO.password, user.password))) {
  
    throw new UnauthorizedException('Invalid credentials');
  }

   if (user.status === StatusEnum.INACTIVE) {
      const otp = generateOTP(6);
      const emailSent = await sendEmail({
      from:'"Eduverse System" <no-reply@eduverse.com>',
      to: user.email,
      subject: 'Login OTP Verification',
      html: `<h1>Hello ${user.fullName}</h1>
             <p>Your OTP is: <strong>${otp}</strong></p>
             <p>This OTP will expire in 10 minutes.</p>`,
    });

    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send email, please try again');
    }
   await this.userRepository.update({
        filter: { email: user.email },
        update: {
          emailOtp: {
            code: otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // fresh 10 minutes
          }
        }
      })
    throw new UnauthorizedException('You should confirm your email first, new OTP sent to your email')

   }
 
  return this.tokenService.generateAuthTokens(user); 
  }

  async confirmEmail(email: string, otp: string) {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.emailOtp || user.emailOtp.expiresAt < new Date() || user.emailOtp.code !== otp) {
      throw new BadRequestException('OTP expired, request a new one')
    }

    await this.userRepository.update({
      filter: { email },
      update: {
        $unset: { emailOtp: "" },
        status: StatusEnum.ACTIVE
      }

    })

    return true
  }


  async resendOtp(email: string) {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.status === StatusEnum.INACTIVE) {
      throw new BadRequestException('Email already verified')
    }

    const otp = generateOTP(6)

    const emailSent = await sendEmail({
      to: email,
      from:'"Eduverse System" <no-reply@eduverse.com>',
      subject: 'New OTP Request',
      html: `<h1>Hello ${user.fullName}</h1>
             <p>Your new OTP is: <strong>${otp}</strong></p>
             <p>This OTP will expire in 10 minutes.</p>`
    })

    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send email, please try again')
    }

    await this.userRepository.update({
      filter: { email },
      update: {
        emailOtp: {
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // fresh 10 minutes
        }
      }
    })
    return true
  }
 // To Do Ask about headers and refresh token
  async refreshToken(token: string) {
    const payload = this.tokenService.verify({
      token,
      options: { secret: process.env.JWT_REFRESH_SECRET }
    })
    const user = await this.userRepository.findOne({filter:{id: new Types.ObjectId(payload._id)}})
    if (!user) {
      throw new UnauthorizedException('Invalid token')
    }
     return this.tokenService.generateAuthTokens(user);
  }

  async forgotPassword(email: string) {

     const user = await this.userRepository.findByEmail(email)
    
     if (!user) {
       throw new NotFoundException('User not found')
     }

     const otp = generateOTP(6)
    
     const emailSent = await sendEmail({
       to: user.email,
       from: '"Eduverse System" <no-reply@eduverse.com>',
       subject: 'Reset Password',
       html: `<h1>Hello ${user.fullName}</h1> 
                  <p>Your reset password OTP is: <strong>${otp}</strong></p>
                  <p>This OTP will expire in 10 minutes.</p>`
     })

     if (!emailSent) {
       throw new InternalServerErrorException('Failed to send email, please try again')
     }

     await this.userRepository.update({
       filter: { email: email },
       update: {
         emailOtp: {
           code: otp,
           expiresAt: new Date(Date.now() + 10 * 60 * 1000)
         }
       }
    })

  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (!user.emailOtp || user.emailOtp.expiresAt < new Date() || user.emailOtp.code !== otp) {
      throw new BadRequestException('OTP expired, request a new one')
    }

    const isSamePassword = await compare(newPassword, user.password)
    if (isSamePassword) {
      throw new BadRequestException('Your new password cannot be the same as the old password')
    }
    await this.userRepository.update({
      filter: { email: email },
      update: {
        $unset: {
          emailOtp: ""
        },
        password: await hashPassword(newPassword)
      }
    })
    return true
  }
}