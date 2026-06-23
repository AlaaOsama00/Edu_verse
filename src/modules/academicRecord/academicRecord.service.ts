import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GradeEnum, GradeStatusEnum, SemesterEnum, SummerReasonEnum, AcademicYearEnum, UserRolesEnum } from '@utils/enum';
import { EnrollmentRepository, UserRepository, AcademicRecordRepository, SubmissionRepository, CourseRepository, CourseRecord, ClubMembershipRepository } from '@models/index';
import { Types } from 'mongoose';
import { gradeToPoints } from '@utils/helpers';
import { completedCoursesCount } from '../Enrollment/enrollment.service';


@Injectable()
export class AcademicRecordService {
  constructor(
    private readonly academicRecordRepository: AcademicRecordRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly userRepository: UserRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly clubMembershipRepository: ClubMembershipRepository,
  ) { }


  // ==========================================
  // جيب كل المواد اللي الطالب أخدها من أول ما دخل الكلية
  // (بتجمع courses + summerCourses من كل الـ AcademicRecords بتاعته)
  //
  // فلاتر اختيارية:
  // - academicYear: يجيب سنة معينة بس
  // - semester: يجيب ترم معين بس (من كل السنين أو من السنة المحددة)
  // ==========================================
  async getAllCourses(
    studentId: string,
    academicYear?: string,
    semester?: SemesterEnum,
  ) {
    const studentObjId = new Types.ObjectId(studentId);

    // فلترة على مستوى الـ Record نفسه لو اليوزر حدد سنة معينة
    const filter: any = { studentId: studentObjId };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const records = await this.academicRecordRepository.find(filter);

    if (records.length === 0) {
      throw new NotFoundException('Not found');
    }

    // بنعمل flatten لكل المواد (العادية + السمر) في array واحدة مسطحة
    // وبنضيف academicYear و isSummer لكل مادة عشان الـ Frontend يعرف مصدرها
    const allCourses = records.flatMap((record) => {
      const regularCourses = (record.courses || []).map((course: any) => {
        const c = course.toObject ? course.toObject() : course;
        return {
          ...c,
          academicYear: record.academicYear,
          isSummer: false,
        };
      });

     

      return [...regularCourses];
    });

    // فلترة بالترم — بعد الـ flatten، لأن الترم موجود جوه كل مادة مش جوه الـ Record
    const filteredCourses = semester
      ? allCourses.filter((course) => course.semester == semester)
      : allCourses;

    return filteredCourses;
  }

  // ==========================================
  // جيب الـ GPA بتاع كل سنة فاتت على الطالب
  //
  // مش محتاجين نحدد "السنة الحالية" يدوي — لأن الـ AcademicRecord
  // بيتعمل لكل سنة بعد ما تخلص بس، فلو الطالب في سنة 3،
  // هيكون عنده بالفعل records لسنة 1 وسنة 2 بس، وده اللي هيترجع تلقائياً
  // ==========================================
  async getGpaHistory(studentId: string) {
    const studentObjId = new Types.ObjectId(studentId);

    const records = await this.academicRecordRepository.find({
      studentId: studentObjId,
    });

    if (records.length == 0) {
      throw new NotFoundException('Not found');
    }

    // بنرتب بالسنة عشان تطلع منظمة (سنة 1 الأول، بعدين 2، ...)
    const sortedRecords = records.sort((a, b) =>
      a.academicYear.localeCompare(b.academicYear),
    );

    return sortedRecords.map((record) => ({
      academicYear: record.academicYear,
      cumulativeGpa: record.cumulativeGpa,
    }));
  }

  // ==========================================
  // داشبورد الطالب (البيانات الإحصائية المتجمعة)
  // ==========================================
  async getStudentDashboard(studentId: string) {
    const studentObjId = new Types.ObjectId(studentId);

    // ==========================================
    // 1. الـ Overall GPA (اللي بنينبناه في الـ Engine)
    // ==========================================
    // بنجيب آخر سجل أكاديمي للطالب (لأن الـ CGPA بيتحسب تراكمياً)
    const latestRecord = await this.academicRecordRepository.findOne({
      filter: { studentId: studentObjId },
      options: { sort: { academicYear: -1 } }
    }); // -1 تعني ترتيب تنازلي (آخر سنة)

    const currentGPA = latestRecord?.cumulativeGpa ?? 0;

    // ==========================================
    // 2. إحصائيات الـ Assessments (Tasks) - بنجيبهم من جدول الـ Grade
    // ==========================================
    // إجمالي الـ Assessments اللي الطالب اتسلمها أو اتدرجت فيها طول عمره في الجامعة
    const gradeStats = await this.submissionRepository.aggregate([

      { $match: { studentId: studentObjId } },

      // 2. شيلنا فوراً كل الحقول اللي مش محتاجها عشان الـ Response يبقى نضيف
      {
        $project: {
          gradeStatus: 1,
          _id: 0
        }
      },

      // 3. $facet: نفصل الداتا لـ "مجموع الكل" و "اللي اتعملتgrading"
      {
        $facet: {
          // القسم الأول: إجمالي الـ Tasks
          totalTasks: [
            { $count: 'total' }
          ],
          // القسم التاني: اللي اتحسبلوا فعلاً
          completedTasks: [
            { $match: { gradeStatus: GradeStatusEnum.GRADED } }, // استخدمناً الـ String مباشرة عشان الـ Repo مش بيشتغل مع الـ Enum في الـ Aggregate دايماً
            { $count: 'completed' }
          ]
        }
      }
    ]);

    // استخراج النتائج من الـ Array اللي رجعته الـ Facet
    const totalTasks = gradeStats[0]?.total?.[0]?.total || 0;
    const completedTasks = gradeStats[0]?.completed?.[0]?.completed || 0;

    // ==========================================
    // 3. التدريب الصيفي (Applied Training)
    // ==========================================
    const trainingEnrollments = await this.enrollmentRepo.find({
      studentId: studentObjId,
      isTraining: true,
      isTrainingApproved: true
    });
    const appliedTraining = trainingEnrollments.length;

    // ==========================================
    // 4. أعلى 5 درجات في كل المواد اللي اخدها في حياته (Top Courses Grades)
    // ==========================================
    const topCoursesGrades = await this.enrollmentRepo.aggregate([
      { $match: { studentId: studentObjId, isPassed: true, isTraining: false } },

      // نجيب بيانات الكورس اللي أخدها
      {
        $lookup: {
          from: 'courses', // ⚠️ تأكد من اسم الكولكشن
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseData',
          // نأخذ الاسم والكود بس عشان الـ Dashboard يبقى خفيف
          pipeline: [{ $project: { name: 1, code: 1, marksDistribution: 1 } }]
        }
      },
      { $unwind: '$courseData' },

      // نرتبهم تنازلياً حسب الـ Total Score
      { $sort: { totalScore: -1 } },

      // ناخد أعلى 5 بس عشان الـ UI
      { $limit: 5 },

      // شكل الداتا النهائي اللي يروح للفرونت
      {
        $project: {
          _id: 0,
          courseName: '$name',
          courseCode: '$code',
          percentage: '$totalScore' // الـ Total Score من 100 هو نسبته المئوية
        }
      }
    ]);

    const GPAHistory = await this.getGpaHistory(studentId);

    const memberships = await this.clubMembershipRepository.find(
      { studentId: studentObjId },
      {},
      {},
      { path: 'clubId', select: 'name' }
    );
    const joinedCommunities = memberships
      .map((m: any) => m.clubId?.name)
      .filter(Boolean);

    // ==========================================
    // الـ Response النهائي
    // ==========================================
    return {
      currentGPA: parseFloat(currentGPA.toFixed(2)), // 1.78
      completedCourses:completedCoursesCount,
      tasks: {
        total: totalTasks,          // 40
        completed: completedTasks   // 5
      },
      appliedTraining, // 1
      topCoursesGrades,       // Array فيها الاسم والنسبة
      GPAHistory:GPAHistory,
      joinedCommunities:joinedCommunities
    };
  }

  async evaluateStudentStatus(studentId: string) {
    const studentObjId = new Types.ObjectId(studentId);

    // 1. Fetch the student profile
    const student = await this.userRepository.findById(studentObjId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const currentYear = student.currentYear; // e.g. '1', '2', '3', '4'

    // 2. Fetch all enrollments for this student for their current academicYear
    const enrollments = await this.enrollmentRepo.find(
      { studentId: studentObjId, academicYear: currentYear },
      {},
      {},
      { path: 'courseId' } // Populate course details
    );

    if (enrollments.length == 0) {
      throw new BadRequestException(`No enrollments found for student in academic year ${currentYear}`);
    }

    // 3. Assert all courses have been graded (excluding training if not graded yet)
    const ungradedCourses = enrollments.filter(e => !e.isTraining && (e.totalScore === null || e.totalScore === undefined || e.finalGrade === null));
    if (ungradedCourses.length > 0) {
      const courseNames = ungradedCourses.map(e => (e.courseId as any)?.name || 'Unknown').join(', ');
      throw new BadRequestException(
        `Cannot evaluate student. The following courses do not have grades yet: ${courseNames}`
      );
    }

    // 4. Determine if student failed at least one course
    const failedCourses = enrollments.filter(e => !e.isPassed && !e.isTraining);
    const hasFailedAny = failedCourses.length > 0;

    // 5. Calculate GPA for the current year
    let yearQualityPoints = 0;
    let yearCreditHours = 0;

    const courseRecordsForAcademicRecord: CourseRecord[] = [];

    for (const e of enrollments) {
      const course = e.courseId as any;
      const creditHours = e.creditHours || course?.creditHours || 0;

      courseRecordsForAcademicRecord.push({
        courseId: course?._id || e.courseId,
        code: course?.code || 'N/A',
        name: course?.name || 'N/A',
        score: e.totalScore ?? 0,
        grade: e.finalGrade ?? 'F',
        creditHours,
        semester: e.semester
      });

      if (!e.isTraining) {
        const gradePoints = gradeToPoints(e.finalGrade || 'F');
        yearQualityPoints += gradePoints * creditHours;
        yearCreditHours += creditHours;
      }
    }

    const yearGpa = yearCreditHours > 0 ? parseFloat((yearQualityPoints / yearCreditHours).toFixed(2)) : 0;

    // 6. Calculate Cumulative GPA
    const previousRecords = await this.academicRecordRepository.find({
      studentId: studentObjId,
      academicYear: { $ne: currentYear }
    });

    let cumulativeQualityPoints = yearQualityPoints;
    let cumulativeCreditHours = yearCreditHours;

    for (const prevRecord of previousRecords) {
      for (const prevCourse of prevRecord.courses) {
        let prevCourseHours = (prevCourse as any).creditHours;
        if (!prevCourseHours) {
          const dbCourse = await this.courseRepository.findById(prevCourse.courseId);
          prevCourseHours = dbCourse?.creditHours || 3;
        }
        const prevPoints = gradeToPoints(prevCourse.grade);
        cumulativeQualityPoints += prevPoints * prevCourseHours;
        cumulativeCreditHours += prevCourseHours;
      }
    }

    const cumulativeGpa = cumulativeCreditHours > 0
      ? parseFloat((cumulativeQualityPoints / cumulativeCreditHours).toFixed(2))
      : yearGpa;

    // 7. Save or update the AcademicRecord for the current year
    const updatedRecord = await this.academicRecordRepository.findOneAndUpdate({
      filter: { studentId: studentObjId, academicYear: currentYear },
      update: {
        $set: {
          yearGpa,
          cumulativeGpa,
          courses: courseRecordsForAcademicRecord
        }
      },
      options: { upsert: true, new: true }
    });

    // 8. Update student year and repeating status
    let nextYear = currentYear;
    let isRepeating = student.isRepeating;

    if (hasFailedAny) {
      isRepeating = true;
    } else {
      isRepeating = false;
      const currentYearNum = parseInt(currentYear);
      const hasSpring = enrollments.some(e => e.semester === SemesterEnum.SPRING);
      if (currentYearNum < 4 && hasSpring) {
        nextYear = String(currentYearNum + 1) as AcademicYearEnum;
      }
    }

    await this.userRepository.findOneAndUpdate({
      filter: { _id: studentObjId },
      update: {
        $set: {
          currentYear: nextYear,
          isRepeating
        }
      }
    });

    return {
      message: hasFailedAny
        ? `Evaluation complete. Student failed at least one course. Student remains in year ${currentYear} (marked as repeating).`
        : nextYear != currentYear
          ? `Evaluation complete. Student passed all courses! Student promoted to year ${nextYear}.`
          : `Evaluation complete. Student passed all current courses in year ${currentYear}.`,
      academicYear: currentYear,
      hasFailed: hasFailedAny,
      yearGpa,
      cumulativeGpa,
      nextYear,
      isRepeating,
      record: updatedRecord
    };
  }

  async evaluateAllStudents() {
    const students = await this.userRepository.find({ role: UserRolesEnum.STUDENT });
    const results: any[] = [];

    for (const student of students) {
      try {
        const result = await this.evaluateStudentStatus(student._id.toString());
        results.push({
          studentId: student._id,
          fullName: student.fullName,
          status: 'SUCCESS',
          message: result.message,
          nextYear: result.nextYear,
          isRepeating: result.isRepeating,
        });
      } catch (err: any) {
        results.push({
          studentId: student._id,
          fullName: student.fullName,
          status: 'FAILED',
          error: err.message || 'Unknown error',
        });
      }
    }

    return {
      total: students.length,
      successCount: results.filter(r => r.status === 'SUCCESS').length,
      failedCount: results.filter(r => r.status === 'FAILED').length,
      results
    };
  }
}