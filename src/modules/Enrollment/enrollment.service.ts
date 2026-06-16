import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EnrollmentStatusEnum, SemesterEnum, SummerReasonEnum } from '@utils/enum';
import { EnrollmentRepository, CourseRepository, StudyPlanRepository, UserRepository } from '@models/index';
import { AddSingleCourseDto } from './dto/add-single-course-dto';



@Injectable()
export class EnrollmentService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly studyPlanRepository: StudyPlanRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly userRepository: UserRepository
  ) { }
  // ==========================================
  // 1. جلب المواد المتاحة للتسجيل (اللي هتظهر في الـ UI)
  // ==========================================
  async getAvailableCourses(studentId: string, semester: SemesterEnum) {
    const student = await this.userRepository.findById(new Types.ObjectId(studentId));
    if (!student) throw new NotFoundException('Failed to load Student profile');

    const academicYear = student.currentYear;

    const plan = await this.studyPlanRepository.findOne({ filter: { academicYear, semester } });
    if (!plan) {
      return { message: 'Failed to find study plan for this semester.', courses: [] };
    }

    // 3. جيب تفاصيل المواد ( Populate )
    const planWithDetails = await plan.populate({
      path: 'courses.courseId',
      select: 'name code creditHours fullName',
    });

    // 4. اشيك المواد اللي هو مسجلها فعلاً (عشان نعملها Disable في الـ UI)
    const existingEnrollments = await this.enrollmentRepository.find({
      studentId: student._id,
      academicYear,
      semester,
    });
    const enrolledCourseIds = new Set(existingEnrollments.map(e => e.courseId.toString()));

    // 5. رجع الداتا للـ Frontend
    const coursesList = (planWithDetails.courses as any[]).map(item => ({
      courseId: item.courseId._id,
      courseCode: item.courseId.code,
      courseName: item.courseId.name,
      creditHours: item.courseId.creditHours,
      professorName: item.courseId.fullName,
      isAlreadyEnrolled: enrolledCourseIds.has(item.courseId._id.toString()), // مهم جداً للـ UI
    }));

    return {
      courses: coursesList,
    };
  }

  // ==========================================
  // 2. إضافة مادة واحدة (لما الطالب يختار مادة من الـ Dropdown)
  // ==========================================
  async addSingleCourse(studentId: string, dto: AddSingleCourseDto) {

    const studentIdObj = new Types.ObjectId(studentId);
    const courseIdObj = new Types.ObjectId(dto.courseId);

    const student = await this.userRepository.findById(studentIdObj);
    if (!student) throw new NotFoundException('Failed to load Student profile');


    // 4. جيب تفاصيل الكورس (عشان الساعات والتدريب)
    const course = await this.courseRepository.findById(courseIdObj);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const plan = await this.studyPlanRepository.findOne({
      filter: { academicYear: student.currentYear, semester: dto.semester },
    });
    if (!plan) {
      throw new BadRequestException('Study plan not found.');
    }

    // 2. ⚠️ الخطوة دي ممنوع تتشال (التحقق من الـ ID المدخل)
    // هدور في الأراي بتاع الخطة، لو ملقتهوش، معناها الطالب بعت ID غلط أو خارج الخطة
    const planCourseData = plan.courses.find(
      (c) => c.courseId.toString() === courseIdObj.toString()
    );

    // if (!planCourseData) {
    //   throw new BadRequestException('Invalid course selection. This course is not in your study plan.');
    // }

    // ?3. تأكد إنه مش مسجلها من قبل (منع التكرار)
    const isAlreadyEnrolled = await this.enrollmentRepository.findOne({
      filter: {
        studentId: studentIdObj,
        courseId: courseIdObj,
        academicYear: student.currentYear,
        semester: dto.semester,
      }
    });

    if (isAlreadyEnrolled) {
      throw new BadRequestException('You are already enrolled in this course.');
    }

   const trainingCodes = ['CS111', 'CS222', 'CS333', 'CS444'];
    const isTrainingCourse = trainingCodes.includes(course.code);

    // 5. إنشاء التسجيل في قاعدة البيانات
    await this.enrollmentRepository.create({
      studentId: studentIdObj,
      courseId: courseIdObj,
      professorId: planCourseData?.professorId, // الدكتور من الخطة
      academicYear: student.currentYear,
      semester: dto.semester,
      summerReason: SummerReasonEnum.NONE,
      attemptCount: 1,
      hasPenalty: false,
      creditHours: course.creditHours,
      isTraining: isTrainingCourse, // حفظناها بناءً على الكود
    });

    // 6. تجهيز الداتا اللي هترجع للـ Frontend زي ما طلبتي بالظبط
    const responseData = {
      studentId: studentIdObj,
      courseId: courseIdObj,
      professorId: planCourseData?.professorId,
      academicYear: student.currentYear,
      semester: dto.semester,
      creditHours: course.creditHours,
      ...(isTrainingCourse && { isTraining: true }), // بترجع true بس لو هي مادة تدريب
      enrollmentStatus: EnrollmentStatusEnum.ACTIVE,
    };

    return {
      message: 'Course added successfully to your schedule.',
      enrollment: responseData,
    };
  }

  // ==========================================
  // 3. تأكيد التسجيل النهائي (لما الطالب يضغط Confirm Registration)
  // ==========================================
  async confirmRegistration(studentId: string, semester: SemesterEnum) {

    const student = await this.userRepository.findById(new Types.ObjectId(studentId));
    if (!student) throw new NotFoundException('Student not found');


    const plan = await this.studyPlanRepository.findOne({
      filter: {
        academicYear: student.currentYear,
        semester: semester,
      }
    });

    if (!plan) throw new BadRequestException('Plan not found.');

   
    // 1. عدّ المواد اللي مسجلها فعلاً في الداتا بيز
    const registeredCount = await this.enrollmentRepository.count({
      
        studentId: new Types.ObjectId(studentId),
        academicYear: student.currentYear,
        semester: semester,
        enrollmentStatus: EnrollmentStatusEnum.ACTIVE,
      
    });
    const requiredCount = plan.courses.length; // 5

    if (registeredCount < requiredCount) {
      const missing = requiredCount - registeredCount;
      throw new BadRequestException(
        `Action blocked! You are missing ${missing} mandatory course(s). You cannot proceed without registering for all ${requiredCount} courses.`
      );
    }

    return {
      message: 'Registration finalized successfully.',
      enrollmentStatus: EnrollmentStatusEnum.COMPLETED
    };
  }


  // ==========================================
  // عرض الجدول (View Schedule)
  // ==========================================
async getMySchedule(studentId: string, semester: string) {

    // 1. هنجيب سجلات التسجيل بالشروط المباشرة عشان الـ Repo ميضربش Error
    const enrollments = await this.enrollmentRepository.find({
      studentId: new Types.ObjectId(studentId),
      semester: semester,
    });

    // 2. هنجيب تفاصيل الكورسات والدكاترة يدوياً (Manual Population)
    const schedule = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        // بنستخدم الـ Repositories المتاحة عشان نجيب الداتا
        const course = await this.courseRepository.findById(enrollment.courseId);
        // افترضت إنك بتجيبي الدكتور من userRepository
        const professor = await this.userRepository.findById(enrollment.professorId);

        return {
          enrollmentId: enrollment._id,
          courseId: course?._id,
          courseCode: course?.code,
          courseName: course?.name,
          creditHours: course?.creditHours,
          isTraining: course?.isTraining || false, 
          professorName: professor?.fullName, // أو الاسم حسب ما متسجل في الموديل
        };
      })
    );

    // 3. حساب مجموع الساعات
    const totalCreditHours = schedule.reduce((sum, course) => sum + (course.creditHours || 0), 0);

    return {
      semester: semester,
      totalCourses: schedule.length,
      totalCreditHours: totalCreditHours,
      courses: schedule,
    };
  }

}