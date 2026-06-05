import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SubmissionStatusEnum, GradeStatusEnum, AssessmentTypeEnum } from '@utils/enum';
import { AssessmentRepository, EnrollmentRepository, GradeRepository } from '@models/index';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly gradeRepo: GradeRepository,
  ) {}

  // ==========================================
  // إنشاء أسيجمنت (1 أو 2) + تهيئة سجلات الدرجات الفاضية
  // ==========================================
  async createAssignment(dto: CreateAssignmentDto, doctorId: string) {
    const courseIdObj = new Types.ObjectId(dto.courseId);
    const doctorIdObj = new Types.ObjectId(doctorId);

    // ⬇️ التحقق الجديد: بدل ما نعدّ، دور هل ده النوع موجود بالفعل ولا لأ؟
    const existingAssessment = await this.assessmentRepo.findOne({
      filter: {
        courseId: courseIdObj,
        type: dto.type, // هل 'assignment1' موجود؟ أو هل 'assignment2' موجود؟
      }
    });

    if (existingAssessment) {
      const typeName = dto.type === AssessmentTypeEnum.ASSIGNMENT1 ? 'Assignment1' : 'Assignment2';//ask
      throw new BadRequestException(`${typeName} already exists for this course.`);
    }

    // إنشاء الـ Assessment
    const newAssessment = await this.assessmentRepo.create({
      courseId: courseIdObj,
      type: dto.type,
      name: dto.name,
      maxMark: dto.maxMark,
      deadline: new Date(dto.deadline),
      createdByProf: doctorIdObj,
    });

    // جيب كل الطلاب المسجلين
    const enrollments = await this.enrollmentRepo.find({
      filter: { courseId: courseIdObj }
    });

    // اعمل لكل طالب سجل Grade فاضي
    for (const enrollment of enrollments) {
      await this.gradeRepo.create({
        studentId: enrollment.studentId,
        courseId: courseIdObj,
        assessmentId: newAssessment._id,
        marks: null,
        submissionStatus: SubmissionStatusEnum.NOT_SUBMITTED,
        gradeStatus: GradeStatusEnum.PENDING,
      });
    }

    return { 
      message: `${dto.name} created successfully.`,
      assessmentId: newAssessment._id ,
      assessmentType: newAssessment.type,
    };
  }

  // ==========================================
  // جلب كل التقييمات الخاصة بكورس معين
  // ==========================================
  async getCourseAssessments(courseId: string) {
    return await this.assessmentRepo.find({
      filter: { courseId: new Types.ObjectId(courseId) }
    });
  }
}