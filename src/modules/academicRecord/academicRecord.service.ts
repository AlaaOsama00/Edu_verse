import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GradeStatusEnum, SemesterEnum, SummerReasonEnum, AcademicYearEnum, UserRolesEnum, SubmissionStatusEnum } from '@utils/enum';
import { EnrollmentRepository, UserRepository, AcademicRecordRepository, SubmissionRepository, CourseRepository, CourseRecord, ClubMembershipRepository } from '@models/index';
import { Types } from 'mongoose';
import { gradeToPoints } from '@utils/helpers';
import { EnrollmentService } from '../Enrollment/enrollment.service';


@Injectable()
export class AcademicRecordService {
  constructor(
    private readonly academicRecordRepository: AcademicRecordRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly userRepository: UserRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly clubMembershipRepository: ClubMembershipRepository,
    private readonly enrollmentService: EnrollmentService,
  ) { }


  // ==========================================
  // جيب كل المواد اللي الطالب أخدها من أول ما دخل الكلية
  // (بتجمع courses + summerCourses من كل الـ AcademicRecords بتاعته)
  //
  // فلاتر اختيارية:
  // - academicYear: يجيب سنة معينة بس
  // - semester: يجيب ترم معين بس (من كل السنين أو من السنة المحددة)
  // ==========================================
  async getAllAcademicSummary(
    studentId: string,
    academicYear?: string,
    semester?: SemesterEnum,
  ) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }
    const studentObjId = new Types.ObjectId(studentId);

    // فلترة على مستوى الـ Record نفسه لو اليوزر حدد سنة معينة
    const filter: any = { studentId: studentObjId };
    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const records = await this.academicRecordRepository.find(filter);

    if (records.length == 0) {
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
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }
    const studentObjId = new Types.ObjectId(studentId);

    const records = await this.academicRecordRepository.find({
      studentId: studentObjId,
    });

    if (records.length == 0) {
      return '0';
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
    // 2. إحصائيات الـ Assessments (Tasks) - بنجيبهم من جدول الـ Grade للترم الحالي
    // ==========================================
    // جلب آخر تسجيل أكاديمي لتحديد الترم والسنة الحالية للطالب
    const latestEnrollment = await this.enrollmentRepo.findOne({
      filter: { studentId: studentObjId },
      options: { sort: { createdAt: -1 } }
    });

    let currentCourseIds: Types.ObjectId[] = [];
    if (latestEnrollment) {
      const currentEnrollments = await this.enrollmentRepo.find({
        studentId: studentObjId,
        academicYear: latestEnrollment.academicYear,
        semester: latestEnrollment.semester,
      });
      currentCourseIds = currentEnrollments.map(e => e.courseId);
    }

    let totalTasks = 0;
    let completedTasks = 0;

    if (currentCourseIds.length > 0) {
      const gradeStats = await this.submissionRepository.aggregate([
        { 
          $match: { 
            studentId: studentObjId,
            submissionStatus: SubmissionStatusEnum.SUBMITTED,
            courseId: { $in: currentCourseIds }
          } 
        },

        // 2. شيلنا فوراً كل الحقول اللي مش محتاجها عشان الـ Response يبقى نضيف
        {
          $project: {
            gradeStatus: 1,
            _id: 0
          }
        },

        // 3. $facet: نفصل الداتا لـ "مجموع الكل" و "اللي اتعملت grading"
        {
          $facet: {
            // القسم الأول: إجمالي الـ Tasks
            totalTasks: [
              { $count: 'total' }
            ],
            // القسم التاني: اللي اتحسبلوا فعلاً
            completedTasks: [
              { $match: { gradeStatus: GradeStatusEnum.GRADED } },
              { $count: 'completed' }
            ]
          }
        }
      ]);

      // استخراج النتائج من الـ Array اللي رجعته الـ Facet باستخدام المفاتيح الصحيحة
      totalTasks = gradeStats[0]?.totalTasks?.[0]?.total || 0;
      completedTasks = gradeStats[0]?.completedTasks?.[0]?.completed || 0;
    }

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
    const topCoursesGrades = await this.academicRecordRepository.aggregate([
      // 1. Match records for this student
      { $match: { studentId: studentObjId } },

      // 2. Unwind the courses array
      { $unwind: '$courses' },

      // 3. Filter out failed courses (grade !== 'F')
      { $match: { 'courses.grade': { $ne: 'F' } } },

      // 4. Sort by score in descending order
      { $sort: { 'courses.score': -1 } },

      // 5. Limit to top 5
      { $limit: 5 },

      // 6. Project the final format expected by the frontend
      {
        $project: {
          _id: 0,
          courseId: '$courses.courseId',
          courseName: '$courses.name',
          courseCode: '$courses.code',
          percentage: '$courses.score',
          score: '$courses.score'
        }
      }
    ]);

    const GPAHistory = await this.getGpaHistory(studentId);

    const memberships = await this.clubMembershipRepository.find(
      { studentId: studentObjId },
      {},
      {},
      { path: 'clubId', select: 'name imageUrl' }
    );
    const joinedCommunities = memberships
      .map((m: any) => m.clubId ? { id: m.clubId._id, name: m.clubId.name, imageUrl: m.clubId.imageUrl } : null)
      .filter(Boolean);

    // 1. Get completed courses from past Academic Records
    const academicRecords = await this.academicRecordRepository.find({
      studentId: studentObjId
    });
    const recordedSemesters = new Set<string>();
    let completedFromAcademicRecords = 0;
    for (const record of academicRecords) {
      if (record.courses) {
        for (const course of record.courses) {
          if (course.grade && course.grade !== 'F') {
            completedFromAcademicRecords++;
          }
          if (course.semester) {
            recordedSemesters.add(`${record.academicYear}_${course.semester}`);
          }
        }
      }
    }

    // 2. Get completed courses from current Enrollments (skipping already recorded semesters)
    const completedCurrentEnrollments = await this.enrollmentRepo.find({
      studentId: studentObjId,
      isPassed: true
    });
    let completedCurrentCount = 0;
    for (const enrollment of completedCurrentEnrollments) {
      const key = `${enrollment.academicYear}_${enrollment.semester}`;
      if (!recordedSemesters.has(key)) {
        completedCurrentCount++;
      }
    }

    const completedCoursesCount = completedFromAcademicRecords + completedCurrentCount;

    // ==========================================
    // الـ Response النهائي
    // ==========================================
    return {
      currentGPA: parseFloat(currentGPA.toFixed(2)), // 1.78
      completedCourses: completedCoursesCount,
      tasks: {
        total: totalTasks,          // 40
        completed: completedTasks   // 5
      },
      appliedTraining, // 1
      topCoursesGrades,       // Array فيها الاسم والنسبة
      GPAHistory: GPAHistory,
      joinedCommunities: joinedCommunities
    };
  }

  async evaluateStudentStatus(studentId: string, semester?: SemesterEnum) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }
    const studentObjId = new Types.ObjectId(studentId);

    // 1. Fetch the student profile
    const student = await this.userRepository.findById(studentObjId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const currentYear = student.currentYear; // e.g. '1', '2', '3', '4'

    // 2. Fetch all enrollments for this student for their current academicYear
    const allYearEnrollments = await this.enrollmentRepo.find(
      { studentId: studentObjId, academicYear: currentYear },
      {},
      {},
      { path: 'courseId' } // Populate course details
    );

    if (allYearEnrollments.length == 0) {
      throw new BadRequestException(`No enrollments found for student in academic year ${currentYear}`);
    }

    // Determine which semesters to evaluate
    const semestersToEvaluate = semester
      ? [semester]
      : Array.from(new Set(allYearEnrollments.map(e => e.semester as SemesterEnum)));

    const evaluationResults: any[] = [];

    for (const sem of semestersToEvaluate) {
      const enrollments = allYearEnrollments.filter(e => e.semester === sem);
      if (enrollments.length == 0) {
        if (semester) {
          throw new BadRequestException(`No enrollments found for student in semester ${sem}`);
        }
        continue;
      }

      // Assert all courses in this semester have been graded (excluding training if not graded yet)
      const ungradedCourses = enrollments.filter(e => !e.isTraining && (e.totalScore == null || e.totalScore == undefined || e.finalGrade == null));
      if (ungradedCourses.length > 0) {
        if (semester) {
          const courseNames = ungradedCourses.map(e => (e.courseId as any)?.name || 'Unknown').join(', ');
          throw new BadRequestException(
            `Cannot evaluate student for semester ${sem}. The following courses do not have grades yet: ${courseNames}`
          );
        }
        // If not explicitly requested, just skip this semester silently
        continue;
      }

      // 4. Determine if student failed at least one course in this semester
      const failedCourses = enrollments.filter(e => !e.isPassed && !e.isTraining);
      const hasFailedAny = failedCourses.length > 0;

      // 5. Calculate GPA for the current semester
      let semQualityPoints = 0;
      let semCreditHours = 0;

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
          semQualityPoints += gradePoints * creditHours;
          semCreditHours += creditHours;
        }
      }

      const yearGpa = semCreditHours > 0 ? parseFloat((semQualityPoints / semCreditHours).toFixed(2)) : 0;

      // 6. Calculate Cumulative GPA (including past years and other semesters)
      // Fetch all academic records except the one we are currently writing
      const previousRecords = await this.academicRecordRepository.find({
        studentId: studentObjId,
        $or: [
          { academicYear: { $ne: currentYear } },
          { academicYear: currentYear, semester: { $ne: sem } }
        ]
      });

      let cumulativeQualityPoints = semQualityPoints;
      let cumulativeCreditHours = semCreditHours;

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

      // 7. Save or update the AcademicRecord for the current year and semester
      const updatedRecord = await this.academicRecordRepository.findOneAndUpdate({
        filter: { studentId: studentObjId, academicYear: currentYear, semester: sem },
        update: {
          $set: {
            yearGpa,
            cumulativeGpa,
            courses: courseRecordsForAcademicRecord
          }
        },
        options: { upsert: true, new: true }
      });

      evaluationResults.push({
        semester: sem,
        hasFailedAny,
        yearGpa,
        cumulativeGpa,
        updatedRecord
      });
    }

    if (evaluationResults.length == 0) {
      throw new BadRequestException(`No semesters are ready for evaluation for student ${student.fullName}`);
    }

    // 8. Update student year and repeating status based on all graded enrollments
    const anyFailedInYear = allYearEnrollments.some(e => !e.isPassed && !e.isTraining && (e.totalScore !== null && e.totalScore !== undefined));
    let nextYear = currentYear;
    let isRepeating = student.isRepeating;

    if (anyFailedInYear) {
      isRepeating = true;
    } else {
      isRepeating = false;
      const currentYearNum = parseInt(currentYear);
      // Promote if student completed SPRING (or both semesters are passed)
      const hasSpring = allYearEnrollments.some(e => e.semester === SemesterEnum.SPRING);
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
      message: `Evaluation completed successfully for student ${student.fullName}. Evaluated semesters: ${evaluationResults.map(r => r.semester).join(', ')}.`,
      results: evaluationResults,
      nextYear,
      isRepeating
    };
  }

  async evaluateAllStudents() {
    const students = await this.userRepository.find({ role: UserRolesEnum.STUDENT });
    const results: any[] = [];

    for (const student of students) {
      const hasEnrollments = await this.enrollmentRepo.findOne({
        filter: { studentId: student._id, academicYear: student.currentYear }
      });
      if (!hasEnrollments) {
        continue;
      }

      const latestEnrollment = await this.enrollmentRepo.findOne({
        filter: { studentId: student._id },
        options: { sort: { createdAt: -1 } }
      });
      const currentSemester = latestEnrollment?.semester;

      const result = await this.evaluateStudentStatus(student._id.toString(), currentSemester);
      results.push({
        studentId: student._id,
        fullName: student.fullName,
        status: 'SUCCESS',
        message: result.message,
        nextYear: result.nextYear,
        isRepeating: result.isRepeating,
      });
    }

    const drops = await this.enrollmentService.dropAllEnrollments();

    return {
      total: students.length,
      successCount: results.length,
      failedCount: 0,
      results,
      drops
    };
  }
}