import { Injectable, BadRequestException,ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssessmentTypeEnum } from '@utils/enum';
import { AssessmentRepository, CourseRepository, EnrollmentRepository, GradeRepository, StudyPlanRepository } from '@models/index';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { calculateTimeLeft } from '@utils/helpers';


@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly gradeRepo: GradeRepository,
    private readonly studyPlan: StudyPlanRepository,
    private readonly courseRepo: CourseRepository,
  ) { }

  // ==========================================
  // إنشاء أسيجمنت (1 أو 2) + تهيئة سجلات الدرجات الفاضية
  // ==========================================
  async createAssignment(professorId: string, dto: CreateAssignmentDto) {

    const course = await this.courseRepo.findById(dto.courseId);
    if (!course) throw new BadRequestException('Course not found');

    const isAssignedToCourse = await this.studyPlan.findOne({
      filter: {
        'courses.courseId': new Types.ObjectId(dto.courseId),
        'courses.professorId': new Types.ObjectId(professorId)
      }
    });

    if (!isAssignedToCourse) {
      throw new ForbiddenException('You are not authorized to create an assessment for this course.');
    }
    // ⬇️ التحقق الجديد: بدل ما نعدّ، دور هل ده النوع موجود بالفعل ولا لأ؟
    const existingAssessment = await this.assessmentRepo.findOne({
      filter: {
        courseId: new Types.ObjectId(dto.courseId),
        type: dto.type, // هل 'assignment1' موجود؟ أو هل 'assignment2' موجود؟
      }
    });

    if (existingAssessment) {
      const typeName = dto.type === AssessmentTypeEnum.ASSIGNMENT1 ? 'Assignment1' : 'Assignment2';//ask
      throw new BadRequestException(`${typeName} already exists for this course.`);
    }

    // إنشاء الـ Assessment
    const newAssessment = await this.assessmentRepo.create({
      courseId: new Types.ObjectId(dto.courseId),
      createdByProf: new Types.ObjectId(professorId),
      type: dto.type,
      name: dto.name,
      deadline: new Date(dto.deadline),
      description: dto.description || '',
      maxMark: course.marksDistribution[dto.type], // اعتمد على توزيع الدرجات في كورس
    });

    // جيب كل الطلاب المسجلين
    // const enrollments = await this.enrollmentRepo.find({
    //   filter: { courseId: new Types.ObjectId(dto.courseId) }
    // });

    // // اعمل لكل طالب سجل Grade فاضي
    // for (const enrollment of enrollments) {
    //   await this.gradeRepo.create({
    //     studentId: enrollment.studentId,
    //     courseId: new Types.ObjectId(dto.courseId),
    //     assessmentId: newAssessment._id,
    //     marks: course.marksDistribution[dto.type],
    //     submissionStatus: SubmissionStatusEnum.NOT_SUBMITTED,
    //     gradeStatus: GradeStatusEnum.PENDING,
    //   });
    // }

    return {
      message: `${newAssessment.name} created successfully.`,
      assessment: {
        courseId: newAssessment.courseId,
        createdByProf: newAssessment.createdByProf,
        type: newAssessment.type,
        name: newAssessment.name,
        deadline: newAssessment.deadline,
        description: newAssessment.description,
        maxMark: newAssessment.maxMark,
      }
    };
  }

 // ==========================================
  // جلب الإعلانات (الوظائف القادمة للطالب)
  //كل مره هيفتح الداشبورد هيعمله اوتوماتيك
  // ==========================================
  async getUpcomingAnnouncements(studentId: string) {
    const now = new Date();

    // 1. نجيب مواد الطالب من الريبو (كما هي)
    const enrollments = await this.enrollmentRepo.find({
        studentId: new Types.ObjectId(studentId),
        enrollmentStatus: 'active' 
      
    });
    const courseIds = enrollments.map(e => e.courseId);

    if (courseIds.length === 0) return []; // لو مفيش مواد، رجع فاضي

    // 2. نستخدم Aggregate في الريبو عشان نعمل Join للكورس والترتيب
    const pipeline = [
      // فلتر الوظائف القادمة للمواد دي بس
      { 
        $match: { 
          courseId: { $in: courseIds }, 
          deadline: { $gte: now } 
        } 
      },
      
      // Join لجدول الكورسات (البديل لـ populate)
      {
        $lookup: {
          from: 'courses', // ⚠️ تأكد من اسم الكولكشن
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' },

      // ترتيب حسب الأقرب (البديل لـ sort)
      { $sort: { deadline: 1 } },

      // شكل الداتا النهائي
      {
        $project: {
          assessmentId: '$_id',
          title: '$name',
          courseName: '$courseData.name',
          deadlineDate: '$deadline',
          _id: 0 // إخفاء الـ _id الأصلي
        }
      }
    ];

    // استدعاء الـ aggregate من خلال الريبو
    const results = await this.assessmentRepo.aggregate(pipeline);

    // 3. نضيف حساب الوقت المتبقي (في JavaScript عادي بعد ما جابت الداتا)
    return results.map(item => ({
      ...item,
      timeLeft:  calculateTimeLeft(new Date(item.deadlineDate))
    }));
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