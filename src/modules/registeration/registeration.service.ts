import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GradeEnum, SemesterEnum, SummerReason } from '@utils/enum';
import { CourseAssessmentRepository, CourseRepository, StudentRepository } from '@models/index';
import { IMarks } from '@interfaces/IMarks';
import { RegisterCoursesDto } from './dto/registrationCourseDto';



@Injectable()
export class RegisterationService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly courseassessmentRepository: CourseAssessmentRepository,
  ) { }

  // تسجيل المواد للفصل الأساسي (First or Second)
  async registerMainSemesterCourses(userId: string, registerDto: RegisterCoursesDto, semester: SemesterEnum) {
    // 1. جيب بيانات الطالب الأكاديمية
    const student = await this.studentRepository.findByUserId((userId));
    if (!student) throw new NotFoundException('Student not found');

    // 2. جيب الكورسات اللي الطالب اختارها من الداتا بيز
    const courses = await this.courseRepository.findCoursesByIds(
      registerDto.courseIds.map(id => new Types.ObjectId(id))
    );

    if (courses.length < 4) {
      throw new BadRequestException('You must select at least 4 courses');
    }

    // 3. فحص أمني: هل الكورسات دي فعلاً بتاعت سنتي والتيرم بتاعي؟
    for (const course of courses) {
      if (course.academicYear !== student.currentYear || course.semester !== semester) {
        throw new BadRequestException(`Course ${course.name} does not match your current year or semester.`);
      }
    }

    // 4. إنشاء سجلات التقييم الفاضية (السر اللي قلناه فوق)
    const defaultMarks: IMarks = { midterm: 0, final: 0, practical: 0, project: 0 };

    for (const course of courses) {
      await this.courseassessmentRepository.create({
        studentId: student._id,
        courseId: course._id,
        academicYear: student.currentYear,
        semester:semester ,
        summerReason: SummerReason.NONE,
        attemptCount: 1,
        marks: defaultMarks,
        totalScore: 0,
        earnedGrade: GradeEnum.F, // لحد ما الأستاذ يدخل الدرجات
        finalGrade: GradeEnum.F,
        isPassed: false,
        creditHours: course.creditHours,
      });
    }
      // LOOP 2: THE MAGIC! If he registered 4, auto-assign the 5th to Summer (NO PENALTY)
    if (courses.length === 4) {
      
      // 1. Get ALL 5 mandatory courses for this year/semester from DB
      const allMandatoryCourses = await this.courseRepository.findByYearAndSemester(
        student.currentYear,
        semester
      );

      // 2. Find the missing one
      //_id tostring() ==> عشان هي لما تيجي بتقارن 2 اوبجكت ايديز بتقارنالريفرنس بتاعهم مكانهم في اليميوري 
      const registeredIds = courses.map(c => c._id?.toString());
      const missingCourse = allMandatoryCourses.find(
        c => !registeredIds.includes(c._id?.toString())
      );

      if (missingCourse) {
        // 3. Create the Summer Assessment automatically
        await this.courseassessmentRepository.create({
          studentId: student._id,
          courseId: missingCourse._id,
          academicYear: student.currentYear,
          semester: SemesterEnum.Summer, // <--- Summer Term
          summerReason: SummerReason.NON_REGISTRATION, // <--- No Penalty!
          attemptCount: 1,
          marks: defaultMarks,
          totalScore: 0,
          earnedGrade: GradeEnum.F,
          finalGrade: GradeEnum.F,
          isPassed: false,
          creditHours: missingCourse.creditHours,
        });
      }
    }
    // 5. تحديث الـ Profile بتاع الطالب بالكورسات اللي سجلها
    await this.studentRepository.update({
      filter: { _id: student._id },
      update: { currentEnrolledCourses: registerDto.courseIds.map(id => new Types.ObjectId(id)) }
    });

    return { message: courses.length === 5 ? 'All 5 courses registered successfully' : '4 courses registered, 1 moved to Summer.' };
  }



}