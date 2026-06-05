import { UserRepository } from '@models/user/user.repository';
import { Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { compare, generateOTP, hashPassword } from 'src/common/utiles/helpers';
import { sendEmail } from 'src/common/utiles/email.utils';
import { TokenService } from 'src/common/service/token.service';
import { Types } from 'mongoose';
import { ActivationEnum, UserRolesEnum } from '@utils/enum';
import { CreateUserDto, SignInDTO } from './dto/authDto';
import { UpdateUserDto } from './dto/updateUserDto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) { }

  async createUser(createUserDto: CreateUserDto) {

    const existingUser = await this.userRepository.findOne({ filter: { email: createUserDto.email } });
    if (existingUser) { throw new BadRequestException('This email already exists.'); }

    if (createUserDto.role === UserRolesEnum.STUDENT) {

      if (!createUserDto.currentYear || !createUserDto.academicId) { throw new BadRequestException('currentYear and academicId are required '); }

      const existingStudentId = await this.userRepository.findOne({ filter: { academicId: createUserDto.academicId } });

      if (existingStudentId) {
        throw new BadRequestException('This academicId is already in use.');
      }
    }

    else {
      if (createUserDto.academicId || createUserDto.currentYear) {
        throw new BadRequestException('academicId or currentYear should not be provided for non-student roles.');
      }
    }
    const hashedPassword = await hashPassword(createUserDto.password);
    const userData: any = {
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
      ...(createUserDto.role === UserRolesEnum.STUDENT && {
        academicId: createUserDto.academicId,
        currentYear: createUserDto.currentYear,
      })
    };

    const user = await this.userRepository.create(userData);

    return {
      message: `${user.role} account created successfully`,
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        ...(user.role === UserRolesEnum.STUDENT && {
          academicId: user.academicId,
          currentYear: user.currentYear,
        }),
      }
    };

  }

  async updateUserData(id: string, updateUserDto: UpdateUserDto) {
    // أولاً: نتأكد إن الطالب موجود
    const user = await this.userRepository.findOne({
      filter: { userId: id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { academicId, currentYear, fullName, email } = updateUserDto;

    // تحديث بيانات الـ Student Profile
    if (academicId || currentYear) {
      const userData: any = {};
      if (academicId) userData.academicId = academicId;
      if (currentYear) userData.currentYear = currentYear;
      if (fullName) userData.fullName = fullName;
      if (email) {
        userData.email = email;
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
          throw new BadRequestException('This email is already used by another user.');
        }
      }
      await this.userRepository.update({ filter: { _id: id }, update: userData });
    }

    return {
      message: 'User updated successfully',
    };
  }

  async deleteUserById(id: string) {
    const user = await this.userRepository.findOne({ filter: { userId: id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ثالثاً: نمسح حساب الـ User المرتبط بيه
    await this.userRepository.deleteOne({ filter: { _id: user._id } });

    return {
      message: 'User deleted successfully'
    };
  }

  async signIn(signInDTO: SignInDTO) {

    const user = await this.userRepository.findByEmail(signInDTO.email);

    if (!user || !(await compare(signInDTO.password, user.password))) {

      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === ActivationEnum.INACTIVE) {
      const otp = generateOTP(6);

      sendEmail({
        to: user.email,
        subject: 'Login OTP Verification',
        html: `<h1>Hello ${user.fullName}</h1>
             <p>Your OTP is: <strong>${otp}</strong></p>
             <p>This OTP will expire in 10 minutes.</p>`,
      }).catch((error) => {
        throw new InternalServerErrorException(error, 'Failed to send OTP email, please try again');
      });


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

    const baseResponse = {
      fullName: user.fullName,
      userId: user._id,
      userEmail: user.email,
      tokens: this.tokenService.generateAuthTokens(user),
      userRole: user.role,
    };

    if (user.role === UserRolesEnum.STUDENT) {
      return {
        ...baseResponse,
        academicId: user.academicId,
        currentYear: user.currentYear,
      };

    }

    return baseResponse;
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
        status: ActivationEnum.ACTIVE
      }

    })

    return true
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.status === ActivationEnum.INACTIVE) {
      throw new BadRequestException('Email already verified')
    }

    const otp = generateOTP(6)

    sendEmail({
      to: user.email,
      subject: 'Reset Password',
      html: `<h1>Hello ${user.fullName}</h1> 
                  <p>Your reset password OTP is: <strong>${otp}</strong></p>
                  <p>This OTP will expire in 10 minutes.</p>`
    }).catch((error) => {
      throw new InternalServerErrorException(error, 'Failed to send OTP email, please try again');
    });


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
    const user = await this.userRepository.findOne({ filter: { id: new Types.ObjectId(payload._id) } })
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

    sendEmail({
      to: user.email,
      subject: 'Reset Password',
      html: `<h1>Hello ${user.fullName}</h1> 
                  <p>Your reset password OTP is: <strong>${otp}</strong></p>
                  <p>This OTP will expire in 10 minutes.</p>`
    }).catch((error) => {
      throw new InternalServerErrorException(error, 'Failed to send OTP email, please try again');
    });

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