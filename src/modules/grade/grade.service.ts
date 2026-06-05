
import { AssessmentRepository,EnrollmentRepository, GradeRepository, UserRepository} from '@models/index';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {  GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';
import { EditGradeDto } from './dto/edit-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';

@Injectable()
export class GradeService {
  constructor(
    private readonly gradeRepo: GradeRepository,
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly userRepository: UserRepository,
  ) {}

   // ==========================================
  // الفحص الأوتوماتيكي للمواعيد (يشتغل لما حد يفتح الصفحة)
  // ==========================================
 private async checkAndApplyDeadlines(assessments: any[]) {
    const now = new Date();

    for (const assess of assessments) {
      // لو التقييم ده مفيهوش Deadline (زي الميدترم)، اتباعد
      if (!assess.deadline) continue;

      // لو الـ Deadline لسه مستقبلي (ما خلصش)، اتبعد
      if (assess.deadline > now) continue;

      // ⬇️ لو وصلنا لهنا، يبقى الـ Deadline خلص!
      // حدّت كل اللي لسه ما سلموا (لأن اللي سلموا قبل كده حالتهم SUBMITTED ومش هيتأثروا)
      await this.gradeRepo.updateMany(
        {
          assessmentId: assess._id,
          submissionStatus: SubmissionStatusEnum.NOT_SUBMITTED,
          gradeStatus: GradeStatusEnum.PENDING, // احترازية: لو الدكتور دخل درجة يدوياً قبل ما الميعاد يقفل، متلمسهاش
        },
        {
          $set: {
            submissionStatus: SubmissionStatusEnum.MISSING,
            marks: 0,
            gradeStatus: GradeStatusEnum.GRADED,
          }
        }
      );
    }
  }
  // ==========================================
  // 1. عرض الـ Gradebook للدكتور
  // ==========================================
   async getGradebook(courseId: string) {
    const courseIdObj = new Types.ObjectId(courseId);

    // أ: جيب كل التقييمات بتاعة الكورس ده (الأعمدة)
    // المفروض ترجعهم مرتبين زي ما انت عاوز (مثلاً: Assignments الأول، ثم Midterm)
    const assessments = await this.assessmentRepo.find({ courseId: courseIdObj });
    
    await this.checkAndApplyDeadlines(assessments);

    // ب: جيب كل الطلاب المسجلين في الكورس ده (الصفوف)
    // بنجيبهم من الـ Enrollment عشان نأكد إنهم فعلاً مسجلين المادة دي
     const enrollments = await this.enrollmentRepo.find({
      filter: { courseId: courseIdObj },
      populate: [
        {
          path: 'studentId', 
          select: 'academicId userId',
          populate: {
            path: 'userId',
            select: 'fullName' // جيب اسم الطالب الحقيقي
          }
        }
      ]
    });
    
    // ج: جيب كل الدرجات اللي موجودة في الداتا بيز للكورس ده
    const grades = await this.gradeRepo.find({ courseId: courseIdObj });

    // د: بناء الـ Matrix (مصفوفة الصفوف والأعمدة اللي هتترسل للواجهة)
    const studentRows = enrollments.map((enrollment: any) => {
      const student = enrollment.studentId;

      // لكل طالب، هندور على درجاته في كل تقييم
      const assessmentsData = assessments.map((assess: any) => {
        // دور، هل في سجل grade فيه studentId == الطالب ده و assessmentId == التقييم ده؟
        const grade = grades.find(
          (g) => g.studentId.toString() === student._id.toString() && 
               g.assessmentId.toString() === assess._id.toString()
        );

        // لو لقينا سجل، حط الدرجات، لو لا، حط Null (يعني فاضي في الجدول)
        return {
          gradeId: grade?._id || null, // مهم جداً: عشان لما الطالب يضغط Save، الواجهة تبعت الـ ID ده
          assessmentId: assess._id,
          assessmentName: assess.name,
          maxMark: assess.maxMark, // عشان الواجهة تعرض "من 10" أو "من 40"
          marks: grade?.marks || null,
          submissionStatus: grade?.submissionStatus || SubmissionStatusEnum.MISSING,
          gradeStatus: grade?.gradeStatus || GradeStatusEnum.PENDING,
        };
      });

      return {
        enrollmentId: enrollment._id,
        studentId: student._id,
        studentName:student.userId?.fullName||'UnKnown Student',
        academicId: student.academicId, 
        assessments: assessmentsData, // مصفوفة الدرجات بتاعته
      };
    });

    return {
      // بندخل الأعمدة والصفوف للواجهة
      columns: assessments, 
      rows: studentRows,
    };
  }

  // ==========================================
  // 2. تعديل درجة طالب واحد
  // ==========================================
  async editGrade(gradeId: string, dto: EditGradeDto) {
    const grade = await this.gradeRepo.findById(new Types.ObjectId(gradeId));
    if (!grade){ 
      throw new NotFoundException('Grade record not found');
    }
    // 1. نتأكد إن الدرجة مش أكبر من الدرجة العظمى (التحقق الديناميكي)
    const assessment = await this.assessmentRepo.findById(grade.assessmentId);
    if (!assessment){
      throw new NotFoundException("this assessment not found")
    }
    if (dto.marks > assessment.maxMark) {
      throw new BadRequestException(`Marks cannot exceed ${assessment.maxMark}`);
    }

    // 2. تحديث الدرجات وتغيير الحالة أوتوماتيكياً

    const filter = { _id: grade._id };
    const update = { 
      $set: { 
        marks: dto.marks, 
        gradeStatus: GradeStatusEnum.GRADED 
      } 
    };

    // 3. نادّي الـ Repo بالشكل اللي بيفتكره
    return this.gradeRepo.update({ filter, update });
  }


  // ==========================================
  // 3. رفع درجات الامتحان من الإكسل (براكتيكال/ميدترم/فاينال)
  // ==========================================
  async bulkUploadGrades(courseId: string, assessmentId: string, dto: BulkGradeDto) {
    const courseIdObj = new Types.ObjectId(courseId);
    const assessmentIdObj = new Types.ObjectId(assessmentId);

    const assessment = await this.assessmentRepo.findById(assessmentIdObj);
    if (!assessment) 
      throw new NotFoundException('Assessment not found');

    let successCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < dto.students.length; i++) {
      const studentData = dto.students[i];

      // 1. التحقق من الدرجة
      if (studentData.marks > assessment.maxMark) {
        errors.push(`Row ${i + 1}: Marks (${studentData.marks}) exceed max (${assessment.maxMark})`);
        continue;
      }

      // 2. جيب الطالب
      const student = await this.userRepository.findOne({ filter: { academicId: studentData.academicId } });
      if (!student) {
        errors.push(`Row ${i + 1}: Student ${studentData.academicId} not found`);
        continue;
      }

      // 3. تأكد من التسجيل
      const isEnrolled = await this.enrollmentRepo.findOne({ filter: { studentId: student._id, courseId: courseIdObj } });
      if (!isEnrolled) {
        errors.push(`Row ${i + 1}: Student ${studentData.academicId} not enrolled`);
        continue;
      }

      // 4. حفظ أو تحديث (نفس الـ Logic القديم بالظبط)
      const existingGrade = await this.gradeRepo.findOne({ filter: { studentId: student._id, assessmentId: assessmentIdObj } });

      if (existingGrade) {
        await this.gradeRepo.update({
          filter: { _id: existingGrade._id },
          update: { $set: { marks: studentData.marks, gradeStatus: GradeStatusEnum.GRADED, submissionStatus: SubmissionStatusEnum.SUBMITTED }}
        });
      } else {
        await this.gradeRepo.create({
          studentId: student._id,
          courseId: courseIdObj,
          assessmentId: assessmentIdObj,
          marks: studentData.marks,
          gradeStatus: GradeStatusEnum.GRADED,
          submissionStatus: SubmissionStatusEnum.SUBMITTED,
        });
      }
      successCount++;
    }

    let mainMessage: string;

    if (errors.length === 0) {
      mainMessage = `All grades saved successfully! (${successCount} students processed).`;
    } else if (successCount === 0) {
      mainMessage = `Failed to save any grades. Please review the errors (${errors.length} failures).`;
    } else {
      mainMessage = `Grades saved with some warnings. (${successCount} succeeded, ${errors.length} failed).`;
    }

    // 2. رجع الـ Response النهائي
    return {
      message: mainMessage, // الرسالة الواضحة
      successCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined, // لو مفيش أخطاء، متروحش ترجعلي الأراي خالي، ارجع undefined
    };  
  }


 
}