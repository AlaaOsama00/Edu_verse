import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AcademicYearEnum,
  SemesterEnum,
  SummerReasonEnum,
  GradeEnum,
  EnrollmentStatusEnum,
} from '@utils/enum';
import type { IMarks } from '@interfaces/IMarks';

@Schema({ timestamps: true })
export class Enrollment {

  // ==========================================
  // 1. بيانات التعريف والتسجيل
  // ==========================================
  
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) 
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;
 
  // حفظنا الـ professorId هنا (Denormalization) عشان ما نعملش Populate مع كل طالب لما نحسب المعدل
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) 
  professorId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum;
 
  @Prop({ type: String, required: true, enum: SemesterEnum })
  semester: SemesterEnum; 

  @Prop({ type: Number, required: true })
  creditHours: number; // متكررة من الكورس عشان سرعة حساب الـ GPA

  @Prop({
    type: String,
    enum: EnrollmentStatusEnum,
    default: EnrollmentStatusEnum.ACTIVE,
  })
  enrollmentStatus: EnrollmentStatusEnum;

  // ==========================================
  // 2. بيانات التدريب (لو الكورس ده تدريب صيفي)
  // ==========================================

  @Prop({ type: Boolean, default: false })
  isTraining: boolean;
 
  @Prop({ type: String, default: null })
  trainingProofPdfUrl: string | null;

  @Prop({ type: Boolean, default: false })
  isTrainingApproved: boolean;

  // ==========================================
  // 3. الدرجات التفصيلية (اللي الدكتور بيرفعها)
  // ==========================================

  @Prop({
    type: {
      midterm: { type: Number, default: 0 },
      final: { type: Number, default: 0 },
      practical: { type: Number, default: 0 },
      assignment1: { type: Number, default: 0 },
      assignment2: { type: Number, default: 0 },
    },
    default: { midterm: 0, final: 0, practical: 0, assignment1: 0, assignment2: 0 },
    _id: false, // مهم جداً عشان ميعملش ID جوه الأوبجكت
  })
  marks:IMarks;

  // ==========================================
  // 4. النتائج النهائية والصيف (بتتحسب في الـ Finalize بس)
  // ==========================================

  @Prop({ type: Number, default: null, min: 0, max: 100 })
  totalScore: number | null; // المجموع الكلي بعد ضرب النسب
 
  @Prop({ type: String, enum: GradeEnum, default: null })
  earnedGrade: GradeEnum | null; // التقدير الطبيعي (مثلاً B+)
 
  @Prop({ type: String, enum: GradeEnum, default: null })
  finalGrade: GradeEnum | null; // التقدير النهائي بعد خصم الـ Penalty لو في (مثلاً B)
 
  @Prop({ type: Boolean, default: false })
  isPassed: boolean;

  @Prop({ type: String, enum: SummerReasonEnum, default: SummerReasonEnum.NONE })
  summerReason: SummerReasonEnum; // ليه دخل الصيف؟ (رسوب / اختياري / لا شيء)
 
  @Prop({ type: Number, default: 1, min: 1, max: 2 })
  attemptCount: number; // أول مرة ياخدها ولا ثاني مرة (Retake)
 
  @Prop({ type: Boolean, default: false })
  hasPenalty: boolean; // لو سقط ودخل الصيف، التقدير بيتنزل درجة
}


export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
 
// منع الطالب يتسجل في نفس الماده في نفس الترم مرتين
EnrollmentSchema.index(
  { studentId: 1, courseId: 1, semester: 1, academicYear: 1 },
  { unique: true },
);
 
// تسريع عملية جلب جدول الطالب في ترم معين
EnrollmentSchema.index({ studentId: 1, academicYear: 1, semester: 1 });