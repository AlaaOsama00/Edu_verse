import { AcademicRecordRepository, UserRepository, CourseRepository, StudyPlanRepository } from '@models/index';
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
        private readonly enrollmentService: EnrollmentService,
        private readonly courseRepo: CourseRepository,
        private readonly studyPlanRepo: StudyPlanRepository,
    ) { }


    async createUser(createUserDto: CreateUserDto) {
        if (createUserDto.role == UserRolesEnum.STUDENT) {
            if (!createUserDto.currentYear || !createUserDto.academicId) {
                throw new BadRequestException('currentYear and academicId are required ');
            }
            createUserDto.email = `eduverse.${createUserDto.academicId}@yopmail.com`;
        } else {
            if (createUserDto.academicId || createUserDto.currentYear) {
                throw new BadRequestException('academicId or currentYear should not be provided for non-student roles.');
            }
            if (!createUserDto.email) {
                throw new BadRequestException('email is required for non-student roles.');
            }
        }

        const existingUser = await this.userRepository.findOne({ filter: { email: createUserDto.email } });
        if (existingUser) { throw new BadRequestException('This email already exists.'); }

        if (createUserDto.role == UserRolesEnum.STUDENT) {
            const existingStudentId = await this.userRepository.findOne({ filter: { academicId: createUserDto.academicId } });

            if (existingStudentId) {
                throw new BadRequestException('This academicId is already in use.');
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

        let emailToCheck: string | undefined;

        if (existingUser.role == UserRolesEnum.STUDENT) {
            if (updateUserDto.currentYear) {
                userData.currentYear = updateUserDto.currentYear;
            }
            if (updateUserDto.academicId) {
                const existingStudentId = await this.userRepository.findOne({ filter: { academicId: updateUserDto.academicId } });
                if (existingStudentId && existingStudentId._id.toString() !== id.toString()) {
                    throw new BadRequestException('This academicId is already in use.');
                }
                userData.academicId = updateUserDto.academicId;
                userData.email = `eduverse.${updateUserDto.academicId}@yopmail.com`;
                emailToCheck = userData.email;
            } else if (updateUserDto.email) {
                userData.email = `eduverse.${existingUser.academicId}@yopmail.com`;
                emailToCheck = userData.email;
            }
        } else {
            if (updateUserDto.academicId || updateUserDto.currentYear) {
                throw new BadRequestException('academicId or currentYear should not be provided for non-student roles.');
            }
            if (updateUserDto.email) {
                userData.email = updateUserDto.email;
                emailToCheck = userData.email;
            }
        }

        if (updateUserDto.fullName) userData.fullName = updateUserDto.fullName;

        if (emailToCheck) {
            const emailOwner = await this.userRepository.findOne({ filter: { email: emailToCheck } });
            if (emailOwner && emailOwner._id.toString() != id.toString()) {
                throw new BadRequestException('This email is already used by another user.');
            }
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
        // 1. هنجيب بيانات المستخدم الأساسية
        const user = await this.userRepository.findById(currentUserId);
        if (!user) throw new NotFoundException('User not found');

        const profileData = user.toObject ? user.toObject() : user;

        // لو المستخدم ليس طالباً، نعرض بروفايله فقط
        if (user.role == UserRolesEnum.PROFESSOR) {
            const plans = await this.studyPlanRepo.find({
                'courses.professorId': new Types.ObjectId(currentUserId)
            });
            const courseIds: Types.ObjectId[] = [];
            for (const plan of plans) {
                for (const c of plan.courses) {
                    if (c.professorId.toString() === currentUserId) {
                        courseIds.push(c.courseId);
                    }
                }
            }
            const uniqueCourseIds = Array.from(new Set(courseIds.map(id => id.toString()))).map(id => new Types.ObjectId(id));
            const courses = await this.courseRepo.find({
                _id: { $in: uniqueCourseIds }
            });

            return {
                profile: {
                    fullName: profileData.fullName,
                    status: profileData.status,
                    email: profileData.email,
                    role: profileData.role,
                    department: profileData.department,
                },
                courses: courses.map(c => ({
                    id: c._id,
                    name: c.name,
                    code: c.code,
                    creditHours: c.creditHours,
                    department: c.department,
                }))
            };
        }

        if (user.role == UserRolesEnum.ADMIN) {
            return {
                profile: {
                    fullName: profileData.fullName,
                    status: profileData.status,
                    email: profileData.email,
                    role: profileData.role,
                    department: profileData.department,
                }
            };
        }


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