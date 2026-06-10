import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {  Course } from '@models/index';
import { AcademicYearEnum, SemesterEnum } from '@utils/enum';
import { AbstractRepository } from '@models/abstract.repository';

@Injectable()
export class CourseRepository extends AbstractRepository<Course> {
 
  constructor(
    @InjectModel(Course.name)protected readonly courseModel: Model<Course>,
  ) 
  {
    super(courseModel);
  }
  // جيب كل مواد سنة معينة في فصل معين   
  async findByYearAndSemester(year: AcademicYearEnum,semester: SemesterEnum,): Promise<Course[]> {
    return this.courseModel.find({ targetYear: year, targetSemester: semester }).exec();
   }

  async create(courseData: Partial<Course>): Promise<Course> {
    const newCourse = new this.courseModel(courseData);
    return newCourse.save();
  }

 async findCoursesByIds(ids: Types.ObjectId[]): Promise<Course[]> {
    return this.courseModel.find({ _id: { $in: ids } }).exec();
  }

  async findAllWithPagination(skip: number, limit: number, filter: any = {}): Promise<Course[]> {
    return this.model.find(filter)
      .sort({ createdAt: -1 }) // ترتيب من الأحدث للأقدم
      .skip(skip) // تخطي عدد معين (مثلاً تخطي أول 10)
      .limit(limit) // خد عدد معين (مثلاً خد 10)
      .exec();
  }
  // جيب العدد الإجمالي (عشان نعمل أزرار الصفحات)
  async countTotal(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

 async aggregate(pipeline: any[]): Promise<any[]> {
    return this.courseModel.aggregate(pipeline).exec();
  }

}