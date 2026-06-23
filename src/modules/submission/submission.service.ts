import { AssessmentRepository, EnrollmentRepository, UserRepository, SubmissionRepository } from '@models/index';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssessmentTypeEnum, GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';
import { BulkGradeDto } from '../grades/dtos/bulk-grade.dto';
import { EditGradeDto } from '../grades/dtos/edit-grade.dto';
import { AcademicRecordService } from '../academicRecord/academicRecord.service';


@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly academicRecordService: AcademicRecordService,
    private readonly userRepository: UserRepository,
  ) { }


  async submitAssignment(studentId: string, assessmentId: string, submissionFileUrl: string) {
    // 1. التأكد من وجود الـ Assessment
    const assessment = await this.assessmentRepo.findById(assessmentId);
    if (!assessment || (assessment.type !== AssessmentTypeEnum.ASSIGNMENT1 && assessment.type !== AssessmentTypeEnum.ASSIGNMENT2)) {
      throw new NotFoundException('Assessment not found or is not an assignment');
    }
    const existingSubmission = await this.submissionRepository.findOne({
      filter: {
        studentId: new Types.ObjectId(studentId),
        assessmentId: new Types.ObjectId(assessmentId),
      },
    });

    // إذا كان السجل موجوداً وحالته "SUBMITTED"، نمنعه من إعادة الرفع
    if (existingSubmission && existingSubmission.submissionStatus == SubmissionStatusEnum.SUBMITTED) {
      throw new ConflictException('You have already submitted this assignment.');
    }
    // (اختياري) التأكد من أن وقت التسليم لم يتجاوز الـ Deadline
    if (assessment.deadline && new Date() > assessment.deadline) {
      throw new BadRequestException('Deadline has passed. Cannot submit.');
    }

    // 2. تحديث أو إنشاء سجل التسليم الخاص بالطالب (Upsert)
    const submittedGrade = await this.submissionRepository.findOneAndUpdate({
      filter: {
        studentId: new Types.ObjectId(studentId),
        assessmentId: new Types.ObjectId(assessmentId),
        courseId: assessment.courseId, // ناخذه من الـ Assessment لضمان صحة البيانات
      },
      update: {
        $set: {
          assigmentType:assessment.type,
          submissionFileUrl,
          submissionStatus: SubmissionStatusEnum.SUBMITTED,
          submittedAt: new Date(),
          gradeStatus: GradeStatusEnum.GRADED,
          mark: 10,
          gradedByProf: assessment.createdBy._id
        
        },
      },
      options: { new: true, upsert: true } // upsert: true تعني لو السجل مش موجود، اعمله جديد
    });

    let markFieldToUpdate = '';
    if (assessment.type === AssessmentTypeEnum.ASSIGNMENT1) {
      markFieldToUpdate = 'marks.assignment1'; // مثال: marks.ass1
    } else if (assessment.type === AssessmentTypeEnum.ASSIGNMENT2) {
      markFieldToUpdate = 'marks.assignment2'; // مثال: marks.ass2
    }

    if (markFieldToUpdate) {
      await this.enrollmentRepo.findOneAndUpdate({
        filter: {
          studentId: new Types.ObjectId(studentId),
          courseId: assessment.courseId,
        },
        update: {
          $set: {
            // نستخدم الأقواس المربعة لجعل اسم الحقل ديناميكياً
            [markFieldToUpdate]: 10
          }
        },
        options: { new: true }
      });
    }

    return {
      message: 'Assignment submitted successfully',
      data: submittedGrade,
    };
  }





  // ==========================================
  // 1. عرض الـ Gradebook للدكتور
  // ==========================================
  async getGradebook(courseId: string) {

    const courseIdObj = new Types.ObjectId(courseId);

    // أ: جيب الأعمدة (التقييمات)

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


  

  }
  // ==========================================
  // 2. تعديل درجة طالب واحد
  // ==========================================
  async editGrade(gradeId: string, dto: EditGradeDto, professorId: string) {
    // 1. Fetching Data
    const grade = await this.submissionRepository.findById(new Types.ObjectId(gradeId));
    if (!grade) {
      throw new NotFoundException('Grade record not found');
    }

    const assessment = await this.assessmentRepo.findById(grade.assessmentId);
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // 2. Validation
    if (dto.marks > assessment.maxMarkAssessment) {
      throw new BadRequestException(`Marks cannot exceed ${assessment.maxMarkAssessment}`);
    }

    if (assessment.createdBy.toString() !== professorId.toString()) {
      // استخدمنا Forbidden لأنها أدق من BadRequest في حالات الصلاحيات
      throw new ForbiddenException('You are not authorized to edit this grade.');
    }

    // 3. Preparing Updates
    const updateGradeTask = this.submissionRepository.update({
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
      gradeId: updateGrade?._id,
      data: updateEnrollment
    }
  }
  // ==========================================
  // 3. رفع درجات الامتحان من الإكسل (براكتيكال/ميدترم/فاينال)
  // ==========================================
  async bulkUploadGrades(professorId: string, dto: BulkGradeDto) {
    const assessment = await this.assessmentRepo.findOne({ filter: { _id: dto.assessmentId } });
    if (!assessment) throw new BadRequestException('Assessment not found');
    if (assessment.createdBy.toString() !== professorId.toString()) throw new BadRequestException('Not authorized.');

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
      await this.submissionRepository.findOneAndUpdate({
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

}


}