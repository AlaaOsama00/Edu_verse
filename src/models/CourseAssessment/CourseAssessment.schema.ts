import type { IMarks } from '@interfaces/IMarks';
import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AcademicYearEnum, GradeEnum, SemesterEnum, SummerReason } from '@utils/enum';
import { Types } from 'mongoose';


@Schema({ timestamps: true })
export class CourseAssessment  {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  // السنة الدراسية اللي أخد فيها المادة (مهم عشان لو رسب وراجع أخدها تاني)
  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum; 

  @Prop({ type: String, required: true, enum: SemesterEnum })
  semester: SemesterEnum;

  // ===== بيانات الترم   =====
  // NONE => [F,S],  SUMMER => [NON REGISTERED,FAILURE]

  @Prop({ type: String,enum: SummerReason,default: SummerReason.NONE})
  summerReason: SummerReason;

  // عدد المحاولات (1 للفصل العادي، 2 لو دخل صيفي)
  @Prop({ type: Number, required: true, default: 1, min: 1, max: 2 })
  attemptCount: number;

  // ===== marks =====
  @Prop({ type: Object, required: true })
  marks: IMarks;// Score detailes

  @Prop({ type: Number, required: true })
  totalScore: number;// total score

  // ===== Grades =====
  @Prop({ type: String, enum: GradeEnum, required: true })
  earnedGrade: string; // الدرجة اللي طلعت من حساب الـ 100

  @Prop({ type: String, enum: GradeEnum, required: true })
  finalGrade: GradeEnum; // الدرجة النهائية بعد تطبيق قانون الـ Penalty

  // ===== حالة المادة =====
  @Prop({ type: Boolean, required: true })
  isPassed: boolean; 

  // تكرار الساعات عشان سهولة حساب الـ Weighted GPA من غير Populate
  @Prop({ type: Number, required: true })
  creditHours: number; 
}

export const CourseAssessmentSchema = SchemaFactory.createForClass(CourseAssessment);

// إنديكسز لتسريع الاستعلامات الأكاديمية
CourseAssessmentSchema.index({ studentId: 1, academicYear: 1, semesterType: 1 });
CourseAssessmentSchema.index({ studentId: 1, courseId: 1 });

