import { UserRepository } from '@models/index';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRolesEnum } from '@utils/enum'; // عدل المسار لو مختلف
import { hashPassword } from '@utils/helpers';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/updateUserDto';
import { EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) { }


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
        const user: any = {
            fullName: createUserDto.fullName,
            email: createUserDto.email,
            password: hashedPassword,
            role: createUserDto.role,
            ...(createUserDto.role === UserRolesEnum.STUDENT && {
                academicId: createUserDto.academicId,
                currentYear: createUserDto.currentYear,
            })
        };

        await this.userRepository.create(user);

        return {
            message: `${user.role} account created successfully`,
            data: {
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            }
        };

    }

    async updateUserData(id: string, updateUserDto: UpdateUserDto) {
        // أولاً: نتأكد إن الطالب موجود
        const userData: any = {};
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        if (existingUser.role === UserRolesEnum.STUDENT) {
            if (updateUserDto.currentYear) userData.currentYear = updateUserDto.currentYear;
            if (updateUserDto.academicId) {
                const existingStudentId = await this.userRepository.findOne({ filter: { academicId: updateUserDto.academicId } });
                if (existingStudentId) {
                    throw new BadRequestException('This academicId is already in use.');
                }
                userData.academicId = updateUserDto.academicId;
            }
        }
        if (existingUser.role == (UserRolesEnum.ADMIN || UserRolesEnum.PROFESSOR) && (updateUserDto.academicId || updateUserDto.currentYear)) {
            throw new BadRequestException('academicId or currentYear should not be provided for non-student roles.');
        }



        if (updateUserDto.fullName) userData.fullName = updateUserDto.fullName;
        if (updateUserDto.email) {

            if (
                existingUser &&
                existingUser._id.toString() !== id.toString()
            ) {
                throw new BadRequestException(
                    'This email is already used by another user.'
                );
            }

            userData.email = updateUserDto.email;
        }

        await this.userRepository.update({
            filter: { _id: id },
            update: userData,
        });

        return {
            message: 'User updated successfully',
        };
    }

    async deleteUserById(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // ثالثاً: نمسح حساب الـ User المرتبط بيه
        await this.userRepository.deleteOne({ filter: { _id: user._id } });

        return {
            message: 'User deleted successfully'
        };
    }
    // دالة جلب اليوزرز حسب الرول
    async getAllUsersByRole(role: UserRolesEnum) {
        let users = await this.userRepository.findAll();

        if (role) {
            users = users.filter((u: any) => u.role === role);
        }
        else{
            throw new ForbiddenException()
        }

        return users;
    }

    async insertManyUsers(usersData: any[]) {

        const usersWithHashedPasswords = await Promise.all(
            usersData.map(async (user) => {
                const userCopy = { ...user };

                if (userCopy.password) {
                    // 2. استخدام دالتك الجاهزة لتشفير الباسوورد
                    userCopy.password = await hashPassword(userCopy.password);
                }

                return userCopy;
            })
        );

        return await this.userRepository.insertMany(usersWithHashedPasswords);
    }


    // البروفايل
    async getUserProfile(currentUser: any, targetUserId: string) {

        if (currentUser.role !== UserRolesEnum.ADMIN && currentUser.userId !== targetUserId) {
            throw new ForbiddenException('You do not have permission to access this profile.');
        }


        const userProfile = await this.userRepository.findById(targetUserId);

        if (!userProfile) throw new NotFoundException('User not found');


        // 3. استبعاد البيانات الحساسة (زي الباسورد)
        const { password,_id,__v,emailOtp, ...rest } = userProfile.toObject ? userProfile.toObject() : userProfile;

        return rest;
    }

}