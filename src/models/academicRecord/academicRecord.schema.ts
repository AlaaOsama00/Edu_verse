import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SemesterEnum } from '@utils/enum';

// 1. تعريف الـ Sub-schema الخاص بتفاصيل كل مادة
@Schema({ _id: false }) // مش محتاجين id لكل مادة لوحدها
export class CourseRecord {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ required: true })
  code: string; // كود المادة

  @Prop({ required: true })
  name: string; // اسم المادة

  @Prop({ required: true })
  score: number; // السكور اللى جابه

  @Prop({ required: true })
  grade: string; // التقدير (A, B, C, F, etc.)

  @Prop({ required: false })
  creditHours?: number; // الساعات المعتمدة

  @Prop({ required: false })
  semester?: SemesterEnum; // الترم الدراسي
}

// 2. تعريف الـ Schema الأساسية للـ Academic Record
@Schema({ timestamps: true })
export class AcademicRecord extends Document {

  // الربط ببيانات الطالب
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ required: true, enum: SemesterEnum })
  semester: SemesterEnum;

  @Prop({ required: false })
  yearGpa?: number; // المعدل السنوي

  @Prop({ required: true })
  cumulativeGpa: number; // المعدل التراكمي الكلي

  // مصفوفة المواد العادية
  @Prop({ type: [CourseRecord], default: [] })
  courses: CourseRecord[];

}

export const AcademicRecordSchema = SchemaFactory.createForClass(AcademicRecord);

// سجل واحد بس لكل طالب في كل سنة دراسية وتيرم
AcademicRecordSchema.index(
  { studentId: 1, academicYear: 1, semester: 1 },
  { unique: true },
);