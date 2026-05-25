import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { calculateWeightedGPA, hashPassword } from '@utils/helpers';
import { AcademicYearEnum, UserRolesEnum } from '@utils/enum';
import { IGradeHours } from '@interfaces/IGradeHours';
import { CourseAssessmentRepository, CourseRepository, StudentRepository, UserRepository } from '@models/index';
import { IPagination } from '@decorators/pagination.decorator';
import { PopulatedStudentProfile } from '@interfaces/IstudentProfile';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly userRepository: UserRepository,
    private readonly assessmentRepository: CourseAssessmentRepository,
  ) { }

  async createStudent(createStudentDto: CreateStudentDto) {


    const existingUser = await this.userRepository.findByEmail(createStudentDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }
    const hashedPassword = await hashPassword(createStudentDto.password);

    const existingStudent = await this.studentRepository.findOne({ filter: { academicId: createStudentDto.academicId } });
    if (existingStudent) {
      throw new BadRequestException('This Academic ID is already registered in the system.');
    }

    const newUser = await this.userRepository.create({
      fullName: createStudentDto.fullName,
      email: createStudentDto.email,
      password: hashedPassword,
      role: UserRolesEnum.STUDENT,
    });

    // 2. إنشاء السجل الأكاديمي (Student Profile) وربطه بالـ User
    const newStudent = await this.studentRepository.create({
      userId: newUser._id.toString(),
      academicId: createStudentDto.academicId,
      currentYear: createStudentDto.currentYear,

    });

    return {
      message: 'Student account created successfully',
      studentId: newStudent.userId,
      academicId: newStudent.academicId,
    };


  }

  async getAllStudents(pagination: IPagination, search?: string, year?: AcademicYearEnum) {
    const { skip, limit } = pagination;

    // 1. بناء الـ Filter بتاع المونجو
    const filter: any = {};
    if (search) {
      // بنبحث في الـ Academic ID أو الاسم (لو كان متسجل في الـ User)
      filter.$or = [
        { academicId: { $regex: search, $options: 'i' } },
      ];
    }
    if (year) {
      filter.currentYear = year;
    }
    // بنبعت للريبو الـ skip و limit
    const [students, total] = await Promise.all([
      this.studentRepository.findAllWithPagination(skip, limit, filter),
      this.studentRepository.countTotal(filter),
    ]);

    const studentsWithGPA = await Promise.all(
      students.map(async (student: any) => {
        // جيب كل السجلات الناجحة للطالب ده
        const records = await this.assessmentRepository.findStudentCumulativeRecords(student._id);

        // جيب الـ Credit Hours والـ Grades عشان تحسبهم
        const gpaData: IGradeHours[] = records.map(r => ({
          grade: r.finalGrade,
          creditHours: r.creditHours,
        }));

        const gpa = calculateWeightedGPA(gpaData);

        // رجع بيانات الطالب مع الـ GPA
        const studentObj = student.toObject();
        const { _id,createdAt,updatedAt, __v,...rest } = studentObj;
        return {
          ...rest, // 2. نرجع باقي البيانات
          gpa: gpa,

        };
      })
    );

    return {
      data: studentsWithGPA,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      }
    };
  }

  async getStudentProfileById(id: string|Types.ObjectId, currentUser: any) {
    // 1. جيب بيانات الطالب الأساسية مع بيانات الـ User
    const student = await this.studentRepository.findStudentProfileById(id) as PopulatedStudentProfile & { _id: Types.ObjectId|string } | null;
    if (!student) throw new NotFoundException('Student not found');

    if (currentUser.role === UserRolesEnum.STUDENT) {

    const profileUserId = student.userId._id.toString();
    const loggedInUserId = currentUser._id.toString(); 

    if (profileUserId !== loggedInUserId) {
      throw new ForbiddenException('You are not allowed to view other students profiles');
    }
  }
    // 2. جيب كل سجلات التقييم اللي الطالب "نجح" فيها (مؤثرين في الـ CGPA والساعات)
    const passedRecords = await this.assessmentRepository.findStudentCumulativeRecords(student._id);

    // 3. احسب إحصائيات النجاح
    const completedCoursesCount = passedRecords.length;

    const totalCreditHours = passedRecords.reduce((sum, record) => {
      return sum + record.creditHours;
    }, 0);

    const gpaData: IGradeHours[] = passedRecords.map(r => ({
      grade: r.finalGrade,
      creditHours: r.creditHours,
    }));
    const currentGPA = calculateWeightedGPA(gpaData);

    // 4. بيانات الترم الحالي (اللي مسجلها دلوقتي)
    const enrolledCoursesCount = student.currentEnrolledCourses?.length || 0;
    let currentCoursesDetails: any[] = [];

    if (enrolledCoursesCount > 0) {
      currentCoursesDetails = await this.courseRepository.findCoursesByIds(student.currentEnrolledCourses);
    }

    // 5. ترتيب الداتا بالشكل اللي الـ UI محتاجه بالظبط
    const user = student.userId || {};
    return {
      // بيانات أساسية
      fullName: user.fullName,
      email: user.email,
      department: user.department || 'Computer Science',
      academicId: student.academicId,
      currentYear: student.currentYear,

      // الإحصائيات (Stats Cards)
      stats: {
        gpa: currentGPA,
        completedCourses: completedCoursesCount,
        enrolledCourses: enrolledCoursesCount,
        totalCreditHours: totalCreditHours,
      },

      // جدول الكورسات الحالية (اللي تحت في الصورة)
      currentCourses: currentCoursesDetails.map(course => ({
        name: course.name,
        code: course.code,
        department: course.department,
        creditHours: course.creditHours,
      }))
    };
  }

  async updateStudentData(id: string, updateStudentDto: UpdateStudentDto) {
    // أولاً: نتأكد إن الطالب موجود
    const student = await this.studentRepository.findOne({
        filter: {
             userId: id  // لو الطالب باعت الـ ID بتاع الـ User اللي خده من اللوجين
           }});

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // ثانياً: نفصل البيانات (إيه يتبع الـ Student وإيه يتبع الـ User)
    const { academicId, currentYear, fullName, email } = updateStudentDto;

    // تحديث بيانات الـ Student Profile
    if (academicId || currentYear) {
      const studentData: any = {};
      if (academicId) studentData.academicId = academicId;
      if (currentYear) studentData.currentYear = currentYear;

      await this.studentRepository.update({ filter: { _id: id }, update: studentData });
    }

    // تحديث بيانات الـ User Account (لو الأدمن عدل الاسم أو الإيميل)
    if (fullName || email) {
      const userData: any = {};
      if (fullName) userData.fullName = fullName;
      if (email) {
        // نتأكد إن الإيميل الجديد مش متسجل عند طالب تاني
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser && existingUser._id.toString() !== student.userId.toString()) {
          throw new BadRequestException('This email is already used by another student.');
        }
        userData.email = email;
      }

      await this.userRepository.update({ filter: { _id: student.userId.toString() }, update: userData });
    }


    return {
      message: 'Student updated successfully',
    };
  }

  async deleteStudentById(id: string) {
    const student = await this.studentRepository.findOne({ filter: { userId: id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // ثانياً: نمسح البروفايل الأكاديمي
    await this.studentRepository.deleteOne({ filter: { _id: student._id } });

    // ثالثاً: نمسح حساب الـ User المرتبط بيه
    await this.userRepository.deleteOne({ filter: { _id: student.userId } });

    return {
      message: 'Student and associated user account deleted successfully'
    };
  }

  async getEnrolledCourses(studentId: string) {

    const student = await this.studentRepository.findOne({filter: {userId: studentId}
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.currentEnrolledCourses.length === 0) {
      return [];
    }

    const coursesDetails = await this.courseRepository.findCoursesByIds(student.currentEnrolledCourses);

    return coursesDetails;
  }

}

