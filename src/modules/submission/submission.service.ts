import { AssessmentRepository, EnrollmentRepository, UserRepository, SubmissionRepository } from '@models/index';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssessmentTypeEnum, GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';
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
 

}