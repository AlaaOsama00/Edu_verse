import { Injectable, NotFoundException, Delete } from '@nestjs/common';
import { IMarks } from '@interfaces/IMarks';
import { Types } from 'mongoose';
import { AcademicYearEnum, SemesterEnum, UserRolesEnum } from '@utils/enum';
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

    const course = await this.courseRepo.findOne({ filter: { code: dto.code } });
    if (course) throw new NotFoundException('Course already exists');

    if (dto.isTraining && dto.semester != SemesterEnum.SUMMER)
      throw new NotFoundException('Training courses can only be offered in the summer semester');

    const marksDistribution: IMarks = {
      midterm: 20,
      final: 40,
      practical: 20,
      assignment1: 10,
      assignment2: 10,
    };

    const newCourse = await this.courseRepo.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      creditHours: dto.creditHours,
      isTraining: dto.isTraining || false,
      marksDistribution: marksDistribution,
    });

    const Professor = await this.userRepository.findById(dto.professorId);
    if (!Professor || Professor.role !== UserRolesEnum.PROFESSOR) {
      throw new NotFoundException('Professor not found');
    }
    await this.studyPlanRepository.findOneAndUpdate({
      filter: {
        academicYear: dto.academicYear,
        semester: dto.semester
      },
      update: {
        $addToSet: {
          courses: {
            courseId: newCourse._id,
            professorId: new Types.ObjectId(dto.professorId),
            //ابوس ايدك ما تغيريها لستريج غيريها في اي حته الا هنا 
          },
        },
      },
      options: {
        upsert: true,
        new: true
      }
    });

    return { message: 'Course created successfully' };
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
    const deletedCourse = await this.courseRepo.deleteOne({ filter: { _id } });
    if (!deletedCourse) throw new NotFoundException('Course not found');
    return { message: 'Course deleted successfully' };
  }



}