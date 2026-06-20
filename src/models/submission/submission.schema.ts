import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GradeStatusEnum, SubmissionStatusEnum } from '@utils/enum';


// ====== حالة التصحيح ======

@Schema({ timestamps: true })

export class Submission {

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;//ASS1  ASS2  MID  FINAL PRACTICAL

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  gradedByProf: Types.ObjectId; // PROF

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  studentId: Types.ObjectId;


  // ====== بيانات التسليم (جديد) ======
  @Prop({ type: String, default: null })
  submissionFileUrl: string;

  @Prop({ type: String, enum: SubmissionStatusEnum, default: SubmissionStatusEnum.NOT_SUBMITTED })
  submissionStatus: SubmissionStatusEnum;  // NOT_SUBMITTED = 'not_submitted', SUBMITTED = 'submitted',MISSING = 'missing'


  @Prop({ type: Date, default: null })
  submittedAt: Date;


  // ====== بيانات التصحيح ======
  @Prop({ type: Number, min: 0, default: null })
  mark: number;

  @Prop({ type: String, enum: GradeStatusEnum, default: GradeStatusEnum.PENDING })
  gradeStatus: GradeStatusEnum; //PENDING = 'pending', GRADED = 'graded'
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// ====== Indexes ======
SubmissionSchema.index(
  { studentId: 1, courseId: 1, assessmentId: 1 },
  { unique: true },
);
SubmissionSchema.index({ courseId: 1, assessmentId: 1 });
SubmissionSchema.index({ studentId: 1, courseId: 1 });
SubmissionSchema.index({ submissionStatus: 1 }); // للبحث عن الـ Missing