import { AcademicRecordRepository, UserRepository } from '@models/index';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivationEnum, UserRolesEnum } from '@utils/enum'; // عدل المسار لو مختلف
import { hashPassword } from '@utils/helpers';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/updateUserDto';
import { Types } from 'mongoose';
import { EnrollmentService } from '../Enrollment/enrollment.service';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly academicRepo: AcademicRecordRepository,
        private readonly enrollmentService: EnrollmentService
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
        else {
            throw new ForbiddenException()
        }

        return users;
    }

    // البروفايل
    async getStudentProfile(currentUserId: string) {
        // 1. هنجيب بيانات الطالب الأساسية
        const user = await this.userRepository.findById(currentUserId);
        if (!user || user.role != UserRolesEnum.STUDENT) throw new NotFoundException('User not found');

        const profileData = user.toObject ? user.toObject() : user;


        // 2. لو اليوزر طالب، هنجيب إحصائياته والمواد اللي مسجلها (ممكن تعدلي أسماء الـ Repos حسب اللي عندك)

        const {
            completedCoursesCount,
            totalCredits,
            currentEnrolledCourses,
            tasks
        } = await this.enrollmentService.getStudentEnrollmentCourses( currentUserId);

        // ده الأضمن عشان بيعمل Sort وبيجيب أحدث سنة
        const academicRecords = await this.academicRepo.find(
            { studentId: new Types.ObjectId(currentUserId) },
            {},
            { sort: { academicYear: -1 }, limit: 1 }
        );

        const currentGPA = academicRecords[0]?.cumulativeGpa || 0;
        return {
            profile: {
                fullName: profileData.fullName,
                status: profileData.status,
                studentId: profileData.academicId,
                department: profileData.department,
                academicYear: profileData.currentYear,
                email: profileData.email,
            },
            statistics: {
                currentGPA: currentGPA,
                completedCourses: completedCoursesCount,
                registeredCourses: currentEnrolledCourses.length,
                totalCredits: totalCredits,
                tasks: tasks,
            },
            enrolledCourses: currentEnrolledCourses
        };
    }


    async searchUsers(searchTerm?: string, role?: string, status?: ActivationEnum | string) {

        const filter: any = {};

        if (role) {
            filter.role = role;
        }

        // استخدام الـ Enum هنا
        if (status && status.toUpperCase() !== 'ALL') {
            // حولنا الكلمة اللي جاية لـ كابيتال، وأكدنا للـ TypeScript إنها من نوع ActivationEnum
            filter.status = status.toUpperCase() as ActivationEnum;
        }

        if (searchTerm) {
            const isNumeric = /^\d+$/.test(searchTerm);
            const startsWithRegex = { $regex: '^' + searchTerm, $options: 'i' };

            if (isNumeric) {
                if (role === UserRolesEnum.STUDENT) {
                    filter.academicId = startsWithRegex;
                }
            } else {
                filter.$or = [
                    { fullName: startsWithRegex },
                    { email: startsWithRegex },
                ];
            }
        }
        const users = await this.userRepository.find(
            filter,
            {
                academicId: 1,
                fullName: 1,
                email: 1,
                role: 1,
                department: 1,
                status: 1,
                _id: 0
            },
            { limit: 20 }
        );

        return users;
    }





}