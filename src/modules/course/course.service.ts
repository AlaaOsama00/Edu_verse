import { Injectable, NotFoundException } from '@nestjs/common';
import { IMarks } from '@interfaces/IMarks';
import { Types } from 'mongoose';
import { AcademicYearEnum, SemesterEnum } from '@utils/enum';
import type { IPagination } from '@decorators/pagination.decorator';
import { CourseRepository } from '@models/index';
import { CreateCourseDto } from './dto/createCourse.dto';
import { UpdateCourseDto } from './dto/updateCourse.dto';

@Injectable()
export class CourseService {

  constructor(private readonly courseRepo: CourseRepository) { }

  async createCourse(dto: CreateCourseDto) {
    const marksDistribution: IMarks = {
      midterm: 20,
      final: 30,
      practical: 20,
      project: 30,
    };

    return this.courseRepo.create({
      name: dto.name,
      code: dto.code,
      academicYear: dto.academicYear,
      description: dto.description,
      semester: dto.semester,
      creditHours: dto.creditHours,
      marksDistribution: marksDistribution,
    });
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
  
  async findCourseById(id: Types.ObjectId) { //To Do Profile
    const course = await this.courseRepo.findOne({ filter: { _id: id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
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

  async getCoursesByYearAndSemester(year: AcademicYearEnum, semester: SemesterEnum) {
    return this.courseRepo.findByYearAndSemester(year, semester);
  }
}