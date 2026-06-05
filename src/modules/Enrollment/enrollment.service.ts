import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EnrollmentStatusEnum, SemesterEnum, SummerReasonEnum } from '@utils/enum';
import { EnrollmentRepository, CourseRepository ,StudyPlanRepository, UserRepository } from '@models/index';
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
    if (!student) throw new NotFoundException('Student profile not found');

    const academicYear = student.currentYear;

    const plan = await this.studyPlanRepository.findOne({ filter: { academicYear, semester } });
    if (!plan) {
      return { message: 'Failed to find study plan for this semester.', courses: [] };
    }

    // 3. جيب تفاصيل المواد ( Populate )
    const planWithDetails = await plan.populate({
      path: 'courses.courseId',
      select: 'name code creditHours professorId',
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
      professorId: item.professorId,
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
    if (!student)
      throw new NotFoundException('Student not found');
    
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

    if (!planCourseData) {
      throw new BadRequestException('Invalid course selection. This course is not in your study plan.');
    }

    // 3. تأكد إنه مش مسجلها من قبل (منع التكرار)
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





    const newEnrollment = await this.enrollmentRepository.create({
      studentId: studentIdObj,
      courseId: courseIdObj,
      professorId: planCourseData.professorId, // الدكتور من الخطة
      academicYear: student.currentYear,
      semester: dto.semester,
      summerReason: SummerReasonEnum.NONE,
      attemptCount: 1,
      hasPenalty: false,
      creditHours: course.creditHours,
      isTraining: course.isTraining,
      enrollmentStatus:EnrollmentStatusEnum.ACTIVE,
    });
    // ==========================================

    return {
      message: 'Course added successfully to your schedule.',
      enrollment: newEnrollment,
    };
  }

  // ==========================================
  // 3. تأكيد التسجيل النهائي (لما الطالب يضغط Confirm Registration)
  // ==========================================
  async confirmRegistration(studentId: string, semester: SemesterEnum) {
    const studentIdObj = new Types.ObjectId(studentId);
    const student = await this.userRepository.findById(studentIdObj);
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
      filter: {
        studentId: studentIdObj,
        academicYear: student.currentYear,
        semester: semester,
        enrollmentStatus: EnrollmentStatusEnum.ACTIVE,
      }
    });

    const requiredCount = plan.courses.length; // 5

    if (registeredCount < requiredCount) {
      const missing = requiredCount - registeredCount;
      throw new BadRequestException(
        `Action blocked! You are missing ${missing} mandatory course(s). You cannot proceed without registering for all ${requiredCount} courses.`
      );
    }

   
    return { 
      message: 'Registration finalized successfully.' 
    };
  }


  // ==========================================
  // عرض الجدول (View Schedule)
  // ==========================================
  async getMySchedule(studentId: string, semester: string) {
    const studentIdObj = new Types.ObjectId(studentId);

    // 1. جيب سجلات التسجيل اللي لسه Active في الترم ده
    const enrollments = await this.enrollmentRepository.find({
      filter: {
        studentId: studentIdObj,
        semester: semester, // 'FALL' أو 'SPRING' أو 'SUMMER'
      },
      populate: [
        {
          path: 'courseId',
          select: 'name code creditHours isTraining' // جيب بيانات المادة الأساسية
        },
        {
          path: 'professorId',
          select: 'fullName' // جيب اسم الدكتور
        }
      ]
    });

    // 2. ترتيب الداتا للواجهة (نظف الشكل)
    const schedule = enrollments.map((enrollment: any) => ({
      enrollmentId: enrollment._id,
      courseId: enrollment.courseId?._id,
      courseCode: enrollment.courseId?.code,
      courseName: enrollment.courseId?.name,
      creditHours: enrollment.courseId?.creditHours,
      isTraining: enrollment.courseId?.isTraining || false, // عشان يميز لو هي مادة تدريب في الصيف
      professorName: enrollment.professorId?.fullName,
    }));

    // 3. حساب مجموع الساعات (مفيد للواجهة)
    const totalCreditHours = schedule.reduce((sum, course) => sum + (course.creditHours || 0), 0);

    return {
      semester: semester,
      totalCourses: schedule.length,
      totalCreditHours: totalCreditHours,
      courses: schedule,
    };
  }





}