import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EnrollmentStatusEnum, SemesterEnum, SummerReasonEnum } from '@utils/enum';
import { EnrollmentRepository, CourseRepository, StudyPlanRepository, UserRepository } from '@models/index';
import { AddCourseDto } from './dto/add-course-dto';



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
  // تسجيل كافة مواد الخطة وتأكيدها دفعة واحدة
  // ==========================================
  async confirmRegistration(studentId: string, dto: AddCourseDto) {
    const studentIdObj = new Types.ObjectId(studentId);

    // 1. جلب بيانات الطالب للتأكد من وجوده ومعرفة سنته الدراسية الحالية
    const student = await this.userRepository.findById(studentIdObj);
    if (!student) throw new NotFoundException('Student not found');

    // 2. جلب الخطة الدراسية الخاصة بسنة الطالب والترم الحالي
    const plan = await this.studyPlanRepository.findOne({
      filter: {
        academicYear: student.currentYear,
        semester: dto.semester,
      }
    });
    if (!plan || !plan.courses || plan.courses.length === 0) {
      throw new BadRequestException('Study plan not found or contains no courses.');
    }

    // 3. التحقق إن الطالب مسجلش قبل كده في الترم ده (عشان نمنع التكرار)
    const existingEnrollmentsCount = await this.enrollmentRepository.count({
      filter: {
        studentId: studentIdObj,
        academicYear: student.currentYear,
        semester: dto.semester,
      }
    });

    if (existingEnrollmentsCount > 0) {
      throw new BadRequestException('You have already registered courses for this semester.');
    }

    // 4. استخراج معرفات المواد (IDs) عشان نجيب تفاصيلهم من الداتا بيز (الساعات والكود)
    const planCourseIds = plan.courses.map(c => c.courseId.toString());

    // بندور على أي كورس مبعوت مش موجود في مصفوفة الخطة
    const invalidCourses = dto.courseId.filter(id => !planCourseIds.includes(id));
    if (invalidCourses.length > 0) {
      throw new BadRequestException('Invalid course selection. Some selected courses are not in your study plan.');
    }

    if (dto.courseId.length !== planCourseIds.length) {
      throw new BadRequestException(`Action blocked! You must register exactly ${planCourseIds.length} courses as per your study plan.`);
    }

    // 5. جلب تفاصيل الكورسات من الـ DB (عشان الساعات وكود المادة)
    const objectIdsArray = dto.courseId.map(id => new Types.ObjectId(id));
    const coursesDetails = await Promise.all(
      objectIdsArray.map(id => this.courseRepository.findById(id))
    );

    const trainingCodes = ['CS111', 'CS222', 'CS333', 'CS444'];

    // 5. تجهيز المصفوفة (Array) اللي هتشيل كل المواد عشان نحفظها
    const enrollmentsToCreate = dto.courseId.map(id => {
      // بنجيب الدكتور المحدد للمادة دي من الخطة
      const planCourse = plan.courses.find(c => c.courseId.toString() === id);
      // بنجيب تفاصيل المادة
      const courseInfo = coursesDetails.find(c => c?._id.toString() === id);

      // لو المادة دي تدريب (Training) الـ min credit hours بتاعتها هتبقى بـ 0 عادي
      const isTrainingCourse = courseInfo ? trainingCodes.includes(courseInfo.code) : false;
      let finalCreditHours = courseInfo?.creditHours || 0;
      if (isTrainingCourse) {
        finalCreditHours = 0;
      }

      return {
        studentId: studentIdObj,
        courseId: new Types.ObjectId(id),
        professorId: planCourse?.professorId,
        academicYear: student.currentYear,
        semester: dto.semester,
        summerReason: SummerReasonEnum.NONE,
        attemptCount: 1,
        hasPenalty: false,
        creditHours: finalCreditHours,
        isTraining: isTrainingCourse,
        enrollmentStatus: EnrollmentStatusEnum.COMPLETED,
      };
    });

    // 6. حفظ كل المواد في قاعدة البيانات بخطوة واحدة
    await this.enrollmentRepository.insertMany(enrollmentsToCreate);

    // 7. إرجاع النتيجة
    return {
      success: true,
      message: `Registration finalized successfully. ${enrollmentsToCreate.length} courses have been added to your schedule.`,
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