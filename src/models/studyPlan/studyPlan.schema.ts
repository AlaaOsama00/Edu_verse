import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {Types } from 'mongoose';
import { AcademicYearEnum, SemesterEnum } from '@utils/enum';


@Schema({ timestamps: true })
export class StudyPlan {
  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum; // "1" | "2" | "3" | "4"

  @Prop({ type: String, required: true, enum: SemesterEnum })
  semester: SemesterEnum; // "FALL" | "SPRING" (مش SUMMER — صح جداً)

  // الـ 5 مواد الإجبارية مع دكاترتهم
  @Prop({
    type: 
      [{
        courseId: { type: Types.ObjectId, ref: 'Course', required: true }, 
        professorId: { type: Types.ObjectId, ref: 'User', required: true } 
      }],
    required: true,
    _id: false, 
  })
  courses: { courseId: Types.ObjectId; professorId: Types.ObjectId }[];
}

export const StudyPlanSchema = SchemaFactory.createForClass(StudyPlan);

StudyPlanSchema.index({ academicYear: 1, semester: 1 }, { unique: true });