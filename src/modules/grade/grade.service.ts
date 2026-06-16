
import { AssessmentRepository, EnrollmentRepository, GradeRepository, UserRepository } from '@models/index';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssessmentTypeEnum, EnrollmentStatusEnum, GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { EditGradeDto } from './dto/edit-grade.dto';
import { AcademicRecordService } from '../academicRecord/academicRecord.service';


@Injectable()
export class GradeService {
  constructor(
    private readonly gradeRepo: GradeRepository,
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly academicRecordService: AcademicRecordService,
    private readonly userRepository: UserRepository
  ) { }

  //! to do mid,final,practical view Dynamic colum for un uploaded grades
  // ==========================================
  // 1. عرض الـ Gradebook للدكتور
  // ==========================================
  async getGradebook(courseId: string) {
    const courseIdObj = new Types.ObjectId(courseId);

    // أ: جيب الأعمدة (التقييمات)
    const assessments = await this.assessmentRepo.find({ courseId: courseIdObj });

    // ب: جيب الصفوف (الطلاب) باستخدام Aggregate
    const enrollments = await this.enrollmentRepo.aggregate([
      { $match: { courseId: courseIdObj } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentData'
        }
      },
      { $unwind: { path: '$studentData', preserveNullAndEmptyArrays: true } }
    ]);

    // ج: جيب كل الدرجات الحقيقية اللي في الداتا
    const grades = await this.gradeRepo.find({ courseId: courseIdObj });

    // د: بناء المصفوفة والمنطق
    const studentRows = enrollments.map((enrollment: any) => {
      const student = enrollment.studentData;
      const studentName = student?.fullName || student?.name || 'Unknown Student';
      const academicId = student?.academicId || 'N/A';

      const assessmentsData = assessments.map((assess: any) => {
        // دور على الدرجة الحقيقية لو موجودة
        const grade = grades.find(
          (g) => g.studentId?.toString() === enrollment.studentId?.toString() &&
            g.assessmentId?.toString() === assess._id?.toString()
        );

        const now = new Date();
        // متغير بيحدد هل الميعاد خلص ولا لسه
        const isDeadlinePassed = assess.deadline && new Date(assess.deadline) <= now;

        let currentSubmissionStatus;
        let currentGradeStatus;
        let displayMarks;

        if (grade) {
          // ==========================================
          // الحالة الأولى: في سجل حقيقي في الداتا (الطالب سلم أو الدكتور دخل درجة)
          // ==========================================
          currentSubmissionStatus = grade.submissionStatus;

          if (isDeadlinePassed && grade.submissionStatus === SubmissionStatusEnum.SUBMITTED) {
            // سلم والميعاد خلص -> ياخد الماكس سكور أوتوماتيك على الشاشة
            currentGradeStatus = GradeStatusEnum.GRADED;
            displayMarks = assess.maxMark;
          } else {
            // غير كده -> نعرض اللي في الداتا زي ما هو
            currentGradeStatus = grade.gradeStatus;
            displayMarks = grade.mark;
          }

        } else {
          // ==========================================
          // الحالة التانية: مفيش سجل خالص في الداتا (معناها مش سلم)
          // ==========================================
          if (isDeadlinePassed) {
            // ميعاد خلص وهو مش سلم -> MISSING و 0
            currentSubmissionStatus = SubmissionStatusEnum.MISSING;
            currentGradeStatus = GradeStatusEnum.GRADED;
            displayMarks = 0;
          } else {
            // لسه وقت -> NOT_SUBMITTED و null
            currentSubmissionStatus = SubmissionStatusEnum.NOT_SUBMITTED;
            currentGradeStatus = GradeStatusEnum.PENDING;
            displayMarks = null;
          }
        }

        return {
          gradeId: grade?._id || null,
          assessmentId: assess._id,
          assessmentName: assess.name,
          maxMark: assess.maxMark,
          marks: displayMarks,
          submissionStatus: currentSubmissionStatus,
          gradeStatus: currentGradeStatus,
        };
      });

      return {
        enrollmentId: enrollment._id,
        studentId: enrollment.studentId,
        studentName: studentName,
        academicId: academicId,
        assessments: assessmentsData,
      };
    });

    return {
      columns: assessments.map(a => ({
        _id: a._id,
        type: a.type,
        name: a.name,
        maxMark: a.maxMark,
        deadline: a.deadline
      })),
      rows: studentRows,

    };
  }
  // ==========================================
  // 2. تعديل درجة طالب واحد
  // ==========================================
  async editGrade(gradeId: string, dto: EditGradeDto, professorId: string) {
  // 1. Fetching Data
  const grade = await this.gradeRepo.findById(new Types.ObjectId(gradeId));
  if (!grade) {
    throw new NotFoundException('Grade record not found');
  }

  const assessment = await this.assessmentRepo.findById(grade.assessmentId);
  if (!assessment) {
    throw new NotFoundException('Assessment not found');
  }

  // 2. Validation
  if (dto.marks > assessment.maxMark) {
    throw new BadRequestException(`Marks cannot exceed ${assessment.maxMark}`);
  }

  if (assessment.createdByProf.toString() !== professorId.toString()) {
    // استخدمنا Forbidden لأنها أدق من BadRequest في حالات الصلاحيات
    throw new ForbiddenException('You are not authorized to edit this grade.'); 
  }

  // 3. Preparing Updates
  const updateGradeTask = this.gradeRepo.update({
    filter: { _id: grade._id }, // الاعتماد على _id زي ما انتي شغالة
    update: {
      $set: {
        marks: dto.marks,
        gradeStatus: GradeStatusEnum.GRADED,
      },
    },
  });

  const updateEnrollmentTask = this.enrollmentRepo.findOneAndUpdate({
    filter: {
      studentId: grade.studentId,
      courseId: assessment.courseId,
    },
    update: {
      $set: {
        [`marks.${assessment.type}`]: dto.marks,
      },
    },
  });

  // 4. Execute concurrently
  // بدل ما نستنى الـ Enrollment يخلص وبعدين نعمل الـ Grade، هنشغلهم مع بعض في نفس الوقت
  const [updateGrade, updateEnrollment] = await Promise.all([updateGradeTask, updateEnrollmentTask]);
  if (updateEnrollment) {
    await this.academicRecordService.evaluateStudentProgress(
      grade.studentId,
      updateEnrollment.academicYear, // أخدناها من الـ enrollment
      updateEnrollment.semester // أخدناها من الـ enrollment
    );
  }
  return {
    gradeId:updateGrade?._id,
    data:updateEnrollment
  }
}
  // ==========================================
  // 3. رفع درجات الامتحان من الإكسل (براكتيكال/ميدترم/فاينال)
  // ==========================================
  async bulkUploadGrades(professorId: string, dto: BulkGradeDto) {
    const assessment = await this.assessmentRepo.findOne({ filter: { _id: dto.assessmentId } });
    if (!assessment) throw new BadRequestException('Assessment not found');
    if (assessment.createdByProf.toString() !== professorId.toString()) throw new BadRequestException('Not authorized.');

    const courseId = assessment.courseId.toString();
    const assessmentType = assessment.type;


    const firstStudent = dto.studentsGrade[0];
    if (!firstStudent) throw new BadRequestException('No students provided');

    const student = await this.userRepository.findOne({ filter: { academicId: firstStudent.academicId } });

    const contextEnrollment = await this.enrollmentRepo.findOne({
      filter: {
        studentId: firstStudent.academicId, // ملاحظة: إنت مستخدم academicId في الـ DTO
        courseId: courseId
      }
    });

    for (const item of dto.studentsGrade) {

      // ⬇️ تحديث مباشرة لأننا متأكدين إن السجل موجود
      await this.gradeRepo.findOneAndUpdate({
        filter: {
          studentId: item.academicId,
          assessmentId: dto.assessmentId
        },
        update: {
          $set: {
            marks: item.marks,
            submissionStatus: SubmissionStatusEnum.SUBMITTED,
            gradeStatus: GradeStatusEnum.GRADED
          }
        }
      });

      // تحديث الـ Enrollment
      await this.enrollmentRepo.findOneAndUpdate({
        filter: { studentId: item.academicId, courseId: courseId },
        update: { $set: { [`marks.${assessmentType}`]: item.marks } },
      });
    }
    // ==========================================
    // ⬇️ التريجر: اطلق المحرك الآلي بعد ما الـ Loop يخلص
    // ==========================================
    if (contextEnrollment && student) {
      await this.academicRecordService.evaluateStudentProgress(
          student._id,
          contextEnrollment.academicYear,
          contextEnrollment.semester,
        
      );
    }
    return { message: `Grades updated successfully for ${assessmentType}.` };
  }
  // ==========================================
  // 4. واجهة الطالب: درجاتي في الترم الحالي
  // ==========================================
  async getMyCurrentGrades(studentId: string, academicYear: string, semester: string) {
    const studentObjId = new Types.ObjectId(studentId);

    // 1. جيب كل الكورسات اللي الطالب مسجل فيها في الترم ده، مع بيانات الكورس
    const enrollmentsWithCourses = await this.enrollmentRepo.aggregate([
      {
        $match: {
          studentId: studentObjId,
          academicYear,
          semester,
          // ⚠️ تأكد إنك مستورد EnrollmentStatusEnum من ملف الـ enums
          enrollmentStatus: EnrollmentStatusEnum.ACTIVE
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' }
    ]);

    if (enrollmentsWithCourses.length === 0) {
      return [];
    }

    // 2. جيب كل الـ Assessments اللي تخص الكورسات دي
    const courseIds = enrollmentsWithCourses.map(e => e.courseId);
    const assessments = await this.assessmentRepo.find({ courseId: { $in: courseIds } });

    // 3. خريطة الأسماء الافتراضية مربوطة بالـ Enum
    const defaultNames: Record<AssessmentTypeEnum, string> = {
      [AssessmentTypeEnum.ASSIGNMENT1]: 'Assignment 1',
      [AssessmentTypeEnum.ASSIGNMENT2]: 'Assignment 2',
      [AssessmentTypeEnum.MIDTERM]: 'Midterm Exam',
      [AssessmentTypeEnum.FINAL]: 'Final Exam',
      [AssessmentTypeEnum.PRACTICAL]: 'Practical',
    };

    // 4. بناء الشكل النهائي للطالب
    const coursesGrades = enrollmentsWithCourses.map((enrollment: any) => {
      const course = enrollment.courseData;
      const dist = course.marksDistribution;
      const myMarks = enrollment.marks || {};

      // بناء مصفوفة التقييمات (بنلف على الـ Enum ونشيل اللي مش موجود في الكورس)
      const assessmentDetails = Object.values(AssessmentTypeEnum)
        .filter(type => {
          // نشيل أي حاجة مش موجودة في توزيع الكورس ده
          return dist[type] !== undefined && dist[type] !== null;
        })
        .map(type => {
          // الآن الـ type معروف للـ TypeScript إنه AssessmentTypeEnum
          const matchingAssessment = assessments.find(a => a.type === type);

          return {
            type: type,
            name: matchingAssessment?.name || defaultNames[type] || type,
            maxMark: dist[type],
            // الدرجة اللي حصل عليها الطالب
            myMark: myMarks[type] !== undefined ? myMarks[type] : null,
            // حالة التقييم
            status: matchingAssessment ? 'ACTIVE' : 'NOT_OPENED_YET'
          };
        });

      return {
        courseId: course._id,
        courseName: course.name,
        courseCode: course.code,
        // لو الأدمن عمل finalize هتظهر النتيجة النهائية
        finalGrade: enrollment.finalGrade || null,
        totalScore: enrollment.totalScore || null,
        // تفاصيل الدرجات
        assessments: assessmentDetails
      };
    });

    return coursesGrades;
  }
}

//!TEST THIS FILE 