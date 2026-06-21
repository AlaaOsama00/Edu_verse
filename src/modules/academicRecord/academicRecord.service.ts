import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GradeEnum, GradeStatusEnum, SemesterEnum, SummerReasonEnum } from '@utils/enum';
import { EnrollmentRepository, UserRepository, AcademicRecordRepository, SubmissionRepository } from '@models/index';
import { Types } from 'mongoose';
import { applyGradePenalty, gradeToPoints } from '@utils/helpers';


@Injectable()
export class AcademicRecordService {
  constructor(
    private readonly academicRecordRepository: AcademicRecordRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly userRepository: UserRepository,
    private readonly submissionRepository: SubmissionRepository
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
    const filter: any = { student: studentObjId };
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
      const regularCourses = record.courses.map((course) => ({
        ...course,
        academicYear: record.academicYear,
        isSummer: false,
      }));

      const summerCourses = record.summerCourses.map((course) => ({
        ...course,
        academicYear: record.academicYear,
        isSummer: true,
      }));

      return [...regularCourses, ...summerCourses];
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
      student: studentObjId,
    });

    if (records.length === 0) {
      throw new NotFoundException('Not found');
    }

    // بنرتب بالسنة عشان تطلع منظمة (سنة 1 الأول، بعدين 2، ...)
    const sortedRecords = records.sort((a, b) =>
      a.academicYear.localeCompare(b.academicYear),
    );

    return sortedRecords.map((record) => ({
      academicYear: record.academicYear,
      annualGpa: record.annualGpa,
      cumulativeGpa: record.cumulativeGpa,
      academicStatus: record.academicStatus,
    }));
  }







  
  // ==========================================
  // المحرك الآلي الشامل (يشتغل تلقائياً لما الدكتور يرفع درجة)
  // ==========================================
  async evaluateStudentProgress(studentId: Types.ObjectId, academicYear: string, currentSemester: SemesterEnum) {

    // 1. جيب كل مواد الطالب في السنة دي (فال، سبرينج، صيف)
    const allYearEnrollments = await this.enrollmentRepo.find({
      filter: {
        studentId: studentId,
        academicYear: academicYear,
      }
    });

    if (allYearEnrollments.length === 0) return;

    // 2. فحص أمني: لو لسه في Fall أو Spring، اخرج فوراً
    if (currentSemester === SemesterEnum.FALL || currentSemester === SemesterEnum.SPRING) {
      return;
    }

    // 3. فحص أمني: لو الطالب ده معيد السنة، مفيش لازمة للحسابات
    const student = await this.userRepository.findById(studentId);
    if (!student || student.isRepeating) return;

    // ==========================================
    // 4. الشرط الأمني: هل كل الدكاترة خلصوا رفع الدرجات؟
    // ==========================================
    const academicCourses = allYearEnrollments.filter(e => !e.isTraining);
    const hasUngradedCourses = academicCourses.some(e => e.totalScore === null || e.totalScore === undefined);

    if (hasUngradedCourses) {
      return; // في درجات ناقصة، رجع بعدين
    }

    // ==========================================
    // 5. معالجة التدريب (لو رفع الـ URL يبقى نجح فوراً)
    // ==========================================
    for (const enrollment of allYearEnrollments) {
      if (enrollment.isTraining && !enrollment.isTrainingApproved) {
        if (enrollment.trainingProofPdfUrl && enrollment.trainingProofPdfUrl.trim() !== '') {
          await this.enrollmentRepo.findOneAndUpdate({
            filter: { _id: enrollment._id },
            update: {
              $set: {
                isTrainingApproved: true,
                totalScore: 100,
                earnedGrade: GradeEnum.A_PLUS,
                finalGrade: GradeEnum.A_PLUS,
                isPassed: true
              }
            }
          });
        }
      }
    }

    // ==========================================
    // 6. إعادة حساب حالة النجاح والرسوب
    // ==========================================
    const failedAcademicCourses = academicCourses.filter(e => !e.isPassed);
    const totalFailures = failedAcademicCourses.length;

    // ==========================================
    // الحالة أ: رسوبتين أو أكتر -> يعيد السنة
    // ==========================================
    if (totalFailures > 1) {
      await this.userRepository.findOneAndUpdate({
        filter: { _id: studentId },
        update: { $set: { isRepeating: true } }
      });

      await this.academicRecordRepository.findOneAndUpdate({
        filter: { studentId: studentId, academicYear: academicYear },
        update: {
          $set: {
            mustRepeatYear: true,
            yearGpa: 0,
            cumulativeGpa: 0,
            failedCount: totalFailures,
            hasPenalty: false
          }
        },
        options: { upsert: true, new: true }
      });

      return;
    }

    // ==========================================
    // الحالة ب: نجاح كامل أو رسوبة واحدة
    // ==========================================

    let totalQualityPoints = 0;
    let totalCreditHours = 0;
    let hasAnyPenalty = false;

    for (const course of academicCourses) {
      // استخدام الـ Type Casting عشان الـ TypeScript يرضى
      let finalGradeToSave = course.earnedGrade as GradeEnum;

      // لو المادة دي مرسوبة وسابقة رسوب (يعني دخل الصيف عشانها)
      if (!course.isPassed && course.summerReason === SummerReasonEnum.FAILURE) {
        // استخدام الدالة اللي في الـ Helpers
        finalGradeToSave = applyGradePenalty(finalGradeToSave, 1);
        hasAnyPenalty = true;

        await this.enrollmentRepo.findOneAndUpdate({
          filter: { _id: course._id },
          update: { $set: { finalGrade: finalGradeToSave, hasPenalty: true } }
        });
      }
      else if (course.isPassed) {
        await this.enrollmentRepo.findOneAndUpdate({
          filter: { _id: course._id },
          update: { $set: { finalGrade: finalGradeToSave } }
        });
      }

      // استخدام الدالة اللي في الـ Helpers لحساب النقاط
      const points = gradeToPoints(finalGradeToSave);
      const hours = course.creditHours || 0;

      totalQualityPoints += points * hours;
      totalCreditHours += hours;
    }

    // ==========================================
    // 7. حساب المعدل الفصلي والتراكمي
    // ==========================================
    const yearGpa = totalCreditHours > 0 ? (totalQualityPoints / totalCreditHours) : 0;

    const previousRecords = await this.academicRecordRepository.find({
      studentId: studentId,
      academicYear: { $lt: academicYear },
      mustRepeatYear: { $ne: true }
    });

    let prevTotalPoints = 0, prevTotalHours = 0;
    previousRecords.forEach(r => {
      prevTotalPoints += (r.annualGpa ?? 0 * 15);
      prevTotalHours += 15;
    });

    const cumulativeGpa = (totalCreditHours + prevTotalHours) > 0
      ? ((totalQualityPoints + prevTotalPoints) / (totalCreditHours + prevTotalHours))
      : yearGpa;

    // ==========================================
    // 8. حفظ السجل الأكاديمي
    // ==========================================
    await this.academicRecordRepository.findOneAndUpdate({
      // 1. Filter
      filter: { studentId: studentId, academicYear: academicYear },

      // 2. Update
      update: {
        $set: {
          failedCount: totalFailures,
          mustRepeatYear: false,
          yearGpa: parseFloat(yearGpa.toFixed(2)),
          cumulativeGpa: parseFloat(cumulativeGpa.toFixed(2)),
          hasPenalty: hasAnyPenalty
        }
      },

      // 3. Options
      options: { upsert: true, new: true }
    });

    // ==========================================
    // 9. الترقية للسنة اللي جاية
    // ==========================================
    const currentYearNum = parseInt(academicYear);
    if (currentYearNum < 4) {
      await this.userRepository.findOneAndUpdate({
        // 1. Filter
        filter: { _id: studentId },

        // 2. Update
        update: {
          $set: {
            academicYear: String(currentYearNum + 1),
            isRepeating: false
          }
        }
      });
    }
  }


  // ==========================================
  // جلب السجل الأكاديمي الكامل (الصفحة الشخصية للتقدير)
  // ==========================================
  async getFullTranscript(studentId: string) {
    const studentObjId = new Types.ObjectId(studentId);

    // 1. جلب بيانات الطالب الحالية عشان نعرف ساعته دلوقتي واسمه
    const student = await this.userRepository.findById(
      studentObjId,
      { password: 0, __v: 0, status: 0 } // الـ Projection
    );

    if (!student) throw new BadRequestException('Student not found');

    const academicRecords = await this.academicRecordRepository.find({
      filter: { studentId: studentObjId },
      options: { sort: { academicYear: 1 } }
    });
    // 3. جلب كل التسجيلات (الـ Enrollments) اللي تمت的历史
    // بنستخدم Aggregate عشان نجيب بيانات الكورس (الاسم والكود)
    const enrollments = await this.enrollmentRepo.aggregate([
      { $match: { studentId: studentObjId } },
      // نرتبهم زمنياً: السنة، ثم الترم
      { $sort: { academicYear: 1, semester: 1 } },
      {
        $lookup: {
          from: 'courses', // ⚠️ تأكد من اسم الكولكشن
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' }
    ]);

    // ==========================================
    // 4. بناء الشكل الجديد (Grouping by Year and Semester)
    // ==========================================
    // هنستخدم Map عشان نرتب الداتا بشكل سريع
    const historyMap = new Map<string, any>();

    for (const en of enrollments) {
      const year = en.academicYear;
      const sem = en.semester;

      // لو مفيش ملف للسنة دي في الخريطة، اعمل واحد فاضي
      if (!historyMap.has(year)) {
        historyMap.set(year, {
          semesters: {}
        });
      }

      const yearData = historyMap.get(year);

      // لو مفيش ملف للترم ده داخل السنة، اعمل Array فاضي
      if (!yearData.semesters[sem]) {
        yearData.semesters[sem] = [];
      }

      // ضف المادة في الترم ده
      yearData.semesters[sem].push({
        courseId: en.courseId,
        courseName: en.courseData.name,
        courseCode: en.courseData.code,
        creditHours: en.courseData.creditHours,
        totalScore: en.totalScore,
        finalGrade: en.finalGrade,
        isPassed: en.isPassed,
        isTraining: en.isTraining || false,
        hasPenalty: en.hasPenalty || false
      });
    }

    // ==========================================
    // 5. دمج الداتا (نربط الـ GPA بالتيرمات)
    // ==========================================
    let overallCGPA = 0;

    const transcriptHistory = academicRecords.map(record => {
      // شوف الـ CGPA لهذه السنة (آخر رقم متسجل)
      if (record.cumulativeGpa !== null) {
        overallCGPA = record.cumulativeGpa;
      }

      return {
        academicYear: record.academicYear,
        yearGpa: record.annualGpa,
        cumulativeGpa: record.cumulativeGpa,
        // هنا نربط التيرمات اللي عملناها في الـ Map
        semesters: historyMap.get(record.academicYear)?.semesters || {}
      };
    });

    // ==========================================
    // 6. الـ Response النهائي
    // ==========================================
    return {
      studentInfo: {
        fullName: student.fullName,
        academicId: student.academicId,
        currentAcademicYear: student.currentYear
      },
      overallCGPA: parseFloat(overallCGPA.toFixed(2)),
      history: transcriptHistory
    };
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
      filter: {
        studentId: studentObjId,
        isTraining: true,
        isTrainingApproved: true
      }
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

    // ==========================================
    // 5. الإعلانات (بسنجيب آخر 3 إعلانات كـ Preview)
    // ==========================================
    // هنستدعي سيرفيس الـ Assessments اللي عملناها قبل كده
    // (تأكد إنك حقنته في الـ Constructor)
    // const latestAnnouncements = await this.assessmentService.getUpcomingAnnouncements(studentId);

    // ==========================================
    // الـ Response النهائي
    // ==========================================
    return {
      currentGPA: parseFloat(currentGPA.toFixed(2)), // 1.78
      tasks: {
        total: totalTasks,          // 40
        completed: completedTasks   // 5
      },
      appliedTraining, // 1
      topCoursesGrades, // Array فيها الاسم والنسبة
      //announcements: latestAnnouncements // لو عايز تعرضهم تحت، شيل علامة التعليق ده وفعّل اللي فوق
    };
  }
}