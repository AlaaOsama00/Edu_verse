import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import{ Student } from './student.schema';
import { PopulatedStudentProfile } from '@interfaces/IstudentProfile';

@Injectable()
export class StudentRepository extends AbstractRepository<Student> {
  constructor(
    @InjectModel(Student.name) studentModel: Model<Student>,
  ) {
    super(studentModel);
  }


    // دالة تجيب بيانات الطالب الأساسية عشان نعرف سنه وتخصصه
  async findByUserId(userId: string|Types.ObjectId) {
    return await this.model.findOne({ userId }).lean().exec();
  }

      // جيب الطلاب بتقسيم الصفحات ومع بيانات اليوزر بتاعهم
  async findAllWithPagination(skip: number, limit: number,filter?: any): Promise<Student[]> {
    return this.model.find(filter||{})
      .populate('userId', 'fullName email department status role')  // جيبلي اسمه وإيميله من جدول اليوزرز
      .sort({ createdAt: -1 }) // ترتيب من الأحدث للأقدم
      .skip(skip) // تخطي عدد معين (مثلاً تخطي أول 10)
      .limit(limit) // خد عدد معين (مثلاً خد 10)
      .exec();
  }

  // جيب العدد الإجمالي (عشان نعمل أزرار الصفحات)
  async countTotal(filter?: any): Promise<number> {
    return this.model.countDocuments(filter || {}).exec();
  }

   async findStudentProfileById(id: string|Types.ObjectId): Promise<PopulatedStudentProfile | null> {
    return this.model.findOne({
        $or: [
      { _id: id },       // لو الأدمن باعت الـ ID بتاع الـ Student
      { userId: id }     // لو الطالب باعت الـ ID بتاع الـ User اللي خده من اللوجين
    ]}
    )
      .populate('userId') 
      .exec() as Promise<PopulatedStudentProfile | null>;
  }

 
}