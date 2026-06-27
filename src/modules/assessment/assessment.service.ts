import { Injectable, BadRequestException, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssessmentRepository, CourseRepository, EnrollmentRepository, StudyPlanRepository } from '@models/index';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { calculateTimeLeft } from '@utils/helpers';
import { CloudinaryService } from 'src/common/multer/cloudinary.service';
import { CommunityGateway } from '../community/community.gateway';
import { ASSESSMENT_MAX_MARKS } from '@utils/constants';


@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly communityGateway: CommunityGateway,
    private readonly courseRepo: CourseRepository,
    private readonly studyPlan: StudyPlanRepository,
  ) { }

  // ==========================================
  // إنشاء أسيجمنت (1 أو 2) + تهيئة سجلات الدرجات الفاضية
  // ==========================================
  async createAssignment(professorId: string, dto: CreateAssignmentDto, file: Express.Multer.File) {
    const allowedLimit = ASSESSMENT_MAX_MARKS[dto.type];
    const course = await this.courseRepo.findById(dto.courseId);
    if (!course) throw new BadRequestException('Course not found');

    const existingAssignment = await this.assessmentRepo.findOne({
      filter: {
        courseId: new Types.ObjectId(dto.courseId),
        type: dto.type // أو ممكن تبحثي بالـ name لو هو ده اللي بيميزه
      }
    });

    if (existingAssignment) {
      throw new ConflictException(`An assignment of type '${dto.type}' already exists for this course.`);
    }


    const isAssignedToCourse = await this.studyPlan.findOne({
      filter: {
        'courses.courseId': new Types.ObjectId(dto.courseId),
        'courses.professorId': new Types.ObjectId(professorId)
      }
    });
    if (!isAssignedToCourse) {
      throw new ForbiddenException('You are not authorized to create an assessment for this course.');
    }
    // 1. التأكد إن الملف موجود وليه Buffer
    if (!file.buffer) {
      throw new BadRequestException('File buffer is empty or Multer is not configured to use MemoryStorage');
    }

    // 2. رفع الملف لـ Cloudinary واستلام اللينك الحقيقي
    const fileUrl = await this.cloudinaryService.uploadAssignment(file);

    // 3. حفظ الداتا في قاعدة البيانات باللينك الجديد
    const task = await this.assessmentRepo.create({
      ...dto,
      // ensure deadline is stored as a Date (convert if string)
      deadline: dto.deadline,
      // convert courseId (string) to ObjectId expected by the model
      courseId: new Types.ObjectId(dto.courseId),
      fileUrl: fileUrl, // 👈 هنا بنحفظ اللينك اللي راجع من Cloudinary
      createdBy: new Types.ObjectId(professorId),
      maxMarkAssessment: allowedLimit,
    });

    // 4. إرسال الإشعار للطلبة (نفس الكود اللي فات)
    const enrolledStudents = await this.enrollmentRepo.find({
      courseId: new Types.ObjectId(dto.courseId)
    });

    // جوه دالة الـ createTask في الـ TaskService

    if (enrolledStudents.length > 0) {
      const studentIds = enrolledStudents.map(enrollment => enrollment.studentId);

      // تجهيز شكل الإشعار اللي هيظهر في الجرس
      const notificationPayload = {
        type: 'NEW_ASSIGNMENT',
        title: `New Assignment in ${dto.type}`,
        body: `Professor has uploaded a new assignment: ${dto.name}`,
        link: `/Assigment/${task._id.toString()}`,
        createdAt: new Date(),
      };

      // إرسال الإشعار اللحظي لكل طالب
      for (const studentId of studentIds) {
        // بنستدعي الجيت واي هنا
        this.communityGateway.emitNotificationToUser(studentId.toString(), notificationPayload);
      }
    }
    const taskObj = (task as any).toObject();
    const { __v, createdAt, updatedAt, ...taskResponse } = taskObj;

    return taskResponse;
  }

  async deleteAssignment(professorId: string, assessmentId: string) {
    if (!Types.ObjectId.isValid(assessmentId)) {
      throw new BadRequestException('Invalid assessment ID');
    }
    // 1. نتأكد إن الأسايمنت موجود أصلاً
    const assignment = await this.assessmentRepo.findById(new Types.ObjectId(assessmentId));

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // (اختياري بس مهم للأمان): نتأكد إن الـ Professor اللي بيمسح هو نفس الشخص اللي كاريته
    if (assignment.createdBy.toString() != professorId) {
      throw new ForbiddenException('You are not allowed to delete this assignment');
    }

    // 2. مسح الملف من Cloudinary
    if (assignment.fileUrl) {
      // بنستخرج الـ public_id من اللينك باستخدام الدالة اللي إنتي عملاها
      const publicId = this.cloudinaryService.extractPublicId(assignment.fileUrl);

      if (publicId) {
        // بنبعت الـ publicId لكلاوديناري عشان يمسح الملف نهائياً
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    // 3. مسح الأسايمنت من الداتا بيز
    await this.assessmentRepo.deleteOne({ filter: { _id: new Types.ObjectId(assessmentId) } });

    // 4. إرجاع رسالة تأكيد للـ Frontend
    return {
      success: true,
      message: 'Assignment and its attached file have been successfully deleted',
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

    });
    const courseIds = enrollments.map(e => e.courseId);

    if (courseIds.length == 0) return []; // لو مفيش مواد، رجع فاضي

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
      timeLeft: calculateTimeLeft(new Date(item.deadlineDate))
    }));
  }

  // ==========================================
  // جلب كل التقييمات الخاصة بكورس معين
  // ==========================================
  async getCourseAssessments(courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }
    const assessments = await this.assessmentRepo.find(
      { courseId: new Types.ObjectId(courseId) },
      undefined,
      undefined,
      [
        { path: 'courseId', select: 'name code' }
      ]
    );

    return assessments.map(assessment => {
      const obj = assessment.toObject ? assessment.toObject() : assessment;
      return obj;
    });
  }

  // ==========================================
  // جلب تقييم معين بالـ ID
  // ==========================================
  async getAssignmentById(professorId: string, assessmentId: string) {
    if (!Types.ObjectId.isValid(assessmentId)) {
      throw new BadRequestException('Invalid assessment ID');
    }
    const assignment = await this.assessmentRepo.findById(new Types.ObjectId(assessmentId));

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.createdBy.toString() != professorId) {
      throw new ForbiddenException('You are not authorized to view this assignment');
    }

    const obj = assignment.toObject ? assignment.toObject() : assignment;
    const { __v, ...response } = obj;
    return response;
  }

  // ==========================================
  // تحديث تقييم معين بالـ ID
  // ==========================================
  async updateAssignment(
    professorId: string,
    assessmentId: string,
    dto: UpdateAssignmentDto,
    file?: Express.Multer.File,
  ) {
    if (!Types.ObjectId.isValid(assessmentId)) {
      throw new BadRequestException('Invalid assessment ID');
    }
    const assignment = await this.assessmentRepo.findById(new Types.ObjectId(assessmentId));

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.createdBy.toString() != professorId) {
      throw new ForbiddenException('You are not allowed to update this assignment');
    }

    const updateData: any = { ...dto };

    if (dto.courseId) {
      updateData.courseId = new Types.ObjectId(dto.courseId);
    }

    if (file) {
      if (!file.buffer) {
        throw new BadRequestException('File buffer is empty');
      }

      // رفع الملف الجديد لكلاوديناري
      const fileUrl = await this.cloudinaryService.uploadAssignment(file);
      updateData.fileUrl = fileUrl;

      // مسح الملف القديم
      if (assignment.fileUrl) {
        const publicId = this.cloudinaryService.extractPublicId(assignment.fileUrl);
        if (publicId) {
          await this.cloudinaryService.deleteFile(publicId);
        }
      }
    }

    if (dto.type) {
      updateData.maxMarkAssessment = ASSESSMENT_MAX_MARKS[dto.type];
    }

    const updatedAssignment = await this.assessmentRepo.findOneAndUpdate({
      filter: { _id: new Types.ObjectId(assessmentId) },
      update: updateData,
      options: { new: true },
    });

    if (!updatedAssignment) {
      throw new NotFoundException('Assignment not found');
    }

    const obj = updatedAssignment.toObject ? updatedAssignment.toObject() : updatedAssignment;
    const { __v,...response } = obj;
    return response;
  }
}