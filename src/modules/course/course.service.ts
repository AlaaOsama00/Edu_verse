import { Injectable, NotFoundException, Delete, ConflictException } from '@nestjs/common';
import { IMarks } from '@interfaces/IMarks';
import { Types } from 'mongoose';
import { SemesterEnum, UserRolesEnum } from '@utils/enum';
import type { IPagination } from '@decorators/pagination.decorator';
import { CourseRepository, StudyPlanRepository, UserRepository } from '@models/index';
import { CreateCourseDto } from './dto/createCourse.dto';
import { UpdateCourseDto } from './dto/updateCourse.dto';

@Injectable()
export class CourseService {

  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly studyPlanRepository: StudyPlanRepository,
    private readonly userRepository: UserRepository
  ) { }


  async createCourse(dto: CreateCourseDto) {

    const { professorEmail, ...courseDataWithoutEmail } = dto;

    const professor = await this.userRepository.findByEmail(professorEmail)
    const course = await this.courseRepo.find({ filter: dto.code })
    if (course) {
      throw new ConflictException('course already exists');
    }

    // 2. تجهيز بيانات الكورس
    const courseToInsert: any = { ...courseDataWithoutEmail };

    // التحقق: إذا لم يكن تدريباً، نضيف توزيع الدرجات الافتراضي
    if (!dto.isTraining) {
      courseToInsert.marksDistribution = {
        midterm: 20,
        final: 40,
        practical: 20,
        assignment1: 10,
        assignment2: 10,
      };
    }
    

    // 3. إنشاء الكورس في قاعدة البيانات
    // استخدمي create بدلاً من insertMany لأننا نتعامل مع كورس واحد
    const newCourse = await this.courseRepo.create(courseToInsert);

    // 4. تحديث الخطة الدراسية (Study Plan)
    await this.studyPlanRepository.findOneAndUpdate({
      filter: {
        academicYear: dto.academicYear,
        semester: dto.semester,
      },
      update: {
        $addToSet: {
          courses: {
            courseId: newCourse._id,
            professorId: new Types.ObjectId(professor?._id), // الحفاظ عليه كـ ObjectId
          },
        },
      },
      options: {
        upsert: true,
        new: true,
      },
    });

    return {
      message: 'Course created successfully',
      courseData: newCourse
    };
  }

  async getAllCourses(pagination: IPagination, search?: string) {
    const { skip, limit } = pagination;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    // جلب الداتا والعدد الإجمالي في نفس الوقت
    const [data, total] = await Promise.all([
      this.courseRepo.findAllWithPagination(skip, limit, filter),
      this.courseRepo.countTotal(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      }
    };
  }

  async findCourseById(id: Types.ObjectId) { // Profile
    const course = await this.courseRepo.findOne({ filter: { _id: id } });
    if (!course) throw new NotFoundException('Course not found');


    const result = await this.courseRepo.aggregate([
      // 1. فلتر الكورس اللي عايزه
      { $match: { _id: new Types.ObjectId(id) } },

      // 2. ابحث في جدول الـ StudyPlan (Join)
      {
        $lookup: {
          from: 'studyplans', // ⚠️ انتبه: ده اسم الكولكشن في الداتا بيز (غالباً جمع وصغير)
          localField: '_id',
          foreignField: 'courses.courseId',
          as: 'planInfo'
        }
      },
      // نفك الـ Array عشان ناخد أول عنصر (لو الكورس متسجل في خطة واحدة)
      { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true } },

      // 3. لقينا الـ StudyPlan، دلوقتي نجيب الـ Object الخاص بالكورس ده عشان نطلع الـ professorId
      {
        $addFields: {
          matchedCourse: {
            $filter: {
              input: '$planInfo.courses',
              as: 'c',
              cond: { $eq: ['$$c.courseId', '$_id'] }
            }
          }
        }
      },
      { $unwind: { path: '$matchedCourse', preserveNullAndEmptyArrays: true } },

      // 4. نجيب بيانات الدكتور من جدول الـ Users
      {
        $lookup: {
          from: 'users', // ⚠️ انتبه: اسم كولكشن اليوزرز في الداتا بيز
          localField: 'matchedCourse.professorId',
          foreignField: '_id',
          as: 'professorData'
        }
      },
      { $unwind: { path: '$professorData', preserveNullAndEmptyArrays: true } },

      // 5. نرتب الشكل النهائي (Clean Output)
      {
        $project: {
          _id: 1,
          code: 1,
          name: 1,
          description: 1,
          department: 1,
          creditHours: 1,
          isTraining: 1,
          marksDistribution: 1,
          // نضيف بيانات الترم
          academicYear: '$planInfo.academicYear',
          semester: '$planInfo.semester',
          // نضيف بيانات الدكتور (من غير الباسورد)
          professor: {
            name: '$professorData.fullName',
            email: '$professorData.email'
          }
        }
      }
    ]);

    return result[0];
  }

  async updateCourse(id: Types.ObjectId, dto: UpdateCourseDto) {
    // بنعمل update وبنشوف لو رجع null يبقى الكورس مش موجود
    const updatedCourse = await this.courseRepo.update({ filter: { _id: id }, update: dto });
    if (!updatedCourse) throw new NotFoundException('Course not found');
    return updatedCourse;
  }

  async deleteCourseById(_id: Types.ObjectId) {
    const deletedCourse = await this.courseRepo.findOneAndDelete({ filter: { _id } });
    const courseInStudyPlan = await this.studyPlanRepository.findOneAndDelete({ filter: { 'courses.courseId': _id } });
    if (!deletedCourse && !courseInStudyPlan) throw new NotFoundException('Course not found');
    return { message: 'Course deleted successfully' };
  }


}