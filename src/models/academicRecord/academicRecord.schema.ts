import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SemesterEnum } from '@utils/enum';

// 1. تعريف الـ Sub-schema الخاص بتفاصيل كل مادة
@Schema({ _id: false }) // مش محتاجين id لكل مادة لوحدها
export class CourseRecord {
  @Prop({ required: true })
  subjectName: string; // اسم المادة

  @Prop({ required: true, min: 0, max: 100 })
  percentage: number; // جايب كام في المية

  @Prop({ required: true })
  grade: string; // الجريد (A, B, C, F, etc.)

  @Prop({ type: String, enum: SemesterEnum, required: true })
  semester: SemesterEnum; // FALL / SPRING
}

// 2. تعريف الـ Schema الأساسية للـ Academic Record
@Schema({ timestamps: true })
export class AcademicRecord extends Document {

  // الربط ببيانات الطالب
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student: Types.ObjectId;

  @Prop({ required: true })
  academicYear: string;

  // المعدلات
  @Prop({ required: true })
  annualGpa: number; // الـ GPA السنوي

  @Prop({ required: true })
  cumulativeGpa: number; // المعدل التراكمي الكلي

  // الحالة الأكاديمية (هينقل، هيعيد، ولا سمر)
  @Prop({
    type: String,
    enum: ['PROMOTED', 'REPEATING', 'SUMMER_COURSES', 'PENDING'],
    default: 'PENDING',
  })
  academicStatus: string;

  // مصفوفة المواد العادية
  @Prop({ type: [CourseRecord], default: [] })
  courses: CourseRecord[];

  // مصفوفة مواد السمر
  @Prop({ type: [CourseRecord], default: [] })
  summerCourses: CourseRecord[];
}

export const AcademicRecordSchema = SchemaFactory.createForClass(AcademicRecord);

// سجل واحد بس لكل طالب في كل سنة دراسية
AcademicRecordSchema.index(
  { student: 1, academicYear: 1 },
  { unique: true },
);