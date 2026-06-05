import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  AcademicYearEnum,
  SemesterEnum,
  SummerReasonEnum,
  GradeEnum,
  EnrollmentStatusEnum,
} from '@utils/enum';
 
 
@Schema({ timestamps: true })
export class Enrollment  {
  
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId: Types.ObjectId;
 
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;
 
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) 
  professorId: Types.ObjectId;

  // ... باقي الكود ...
 
  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum;
 
  @Prop({ type: String, required: true, enum: SemesterEnum })
  semester: SemesterEnum; // "FALL" | "SPRING" | "SUMMER"
 
  // ===== بيانات Summer =====
 
  @Prop({ type: String, enum: SummerReasonEnum, default: SummerReasonEnum.NONE })
  summerReason: SummerReasonEnum; // "FAILED" | "OPTIONAL" | "NONE"
 
  // عدد المحاولات — 1 عادي، 2 لو دخل السمر بعد ما سقط
  @Prop({ type: Number, default: 1, min: 1, max: 2 })
  attemptCount: number;
 
  // لو سقط وعمل retake في السمر → الـ grade بتنزل خطوة
  @Prop({ type: Boolean, default: false })
  hasPenalty: boolean;
 
  // ===== النتيجة =====
 
  // الدرجة الكاملة من 100
  @Prop({ type: Number, default: null, min: 0, max: 100 })
  totalScore: number | null;
 
  // الـ grade الطبيعية قبل أي penalty
  @Prop({ type: String, enum: GradeEnum, default: null })
  earnedGrade: GradeEnum | null;
 
  // الـ grade النهائية بعد الـ penalty لو موجودة
  @Prop({ type: String, enum: GradeEnum, default: null })
  finalGrade: GradeEnum | null;
 
  @Prop({ type: Boolean, default: false })
  isPassed: boolean;
 
  // creditHours محفوظة هنا عشان سهولة حساب الـ GPA بدون populate
  @Prop({ type: Number, required: true })
  creditHours: number;
 
  // ===== التدريب الصيفي =====
 
  // لو الـ enrollment ده للتدريب الصيفي مش ماده عادية
  @Prop({ type: Boolean, default: false })
  isTraining: boolean;
 
  // الـ PDF اللي رفعه الطالب كإثبات حضور
  @Prop({ type: String, default: null })
  trainingProofPdfUrl: string | null;
 
  // الأدمن وافق على الـ PDF
  @Prop({ type: Boolean, default: false })
  isTrainingApproved: boolean;
 
  // ===== حالة التسجيل =====
  @Prop({
    type: String,
    enum: EnrollmentStatusEnum,
    default: EnrollmentStatusEnum.ACTIVE,
  })
  enrollmentStatus: EnrollmentStatusEnum;
}
 
export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
 
// منع الطالب يتسجل في نفس الماده في نفس الترم مرتين
EnrollmentSchema.index(
  { studentId: 1, courseId: 1, semester: 1, academicYear: 1 },
  { unique: true },
);
 
// جيب جدول الطالب في ترم معين
EnrollmentSchema.index({ studentId: 1, academicYear: 1, semester: 1 });