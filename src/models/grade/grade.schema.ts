import { Assessment } from './../assessment/assessment.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';

export type GradeDocument = Grade & Document;

// ====== حالة التصحيح ======


@Schema({ timestamps: true })

export class Grade {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  gradedByProf: Types.ObjectId;

  // ====== بيانات التسليم (جديد) ======

  @Prop({ type: String, enum: SubmissionStatusEnum, default: SubmissionStatusEnum.NOT_SUBMITTED })
  submissionStatus: SubmissionStatusEnum;

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;      // وقت التسليم الفعلي


  // ====== بيانات التصحيح ======
  @Prop({ type: Number,min:0, default:null})
  marks: number;

  @Prop({ type: String, enum: GradeStatusEnum, default: GradeStatusEnum.PENDING })
  gradeStatus: GradeStatusEnum;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);

// ====== Indexes ======
GradeSchema.index(
  { studentId: 1, courseId: 1, assessmentId: 1 },
  { unique: true },
);
GradeSchema.index({ courseId: 1, assessmentId: 1 });
GradeSchema.index({ studentId: 1, courseId: 1 });
GradeSchema.index({ submissionStatus: 1 }); // للبحث عن الـ Missing