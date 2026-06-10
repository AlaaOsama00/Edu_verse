import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AcademicYearEnum } from '@utils/enum';


@Schema({ timestamps: true })
export class AcademicRecord {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum;


  // عدد المواد اللي سقط فيها في السنة دي
  @Prop({ type: Number, required: true, default: 0 })
  failedCount: number;

  // أكتر من 2 مواد راسب → لازم يعيد السنة
  @Prop({ type: Boolean, default: false })
  mustRepeatYear: boolean;

  // الـ GPA في نهاية السنة دي بس (مش الـ cumulative)
  @Prop({ type: Number, default: null, min: 0, max: 4 })
  yearGpa: number | null;

  // الـ GPA التراكمي لحد نهاية السنة دي
  @Prop({ type: Number, default: null, min: 0, max: 4 })
  cumulativeGpa: number | null;

  // هل الطالب اتسمح له يعدي للسنة الجاية
  @Prop({ type: Boolean, default: false })
  isPromoted: boolean;

}

export const AcademicRecordSchema = SchemaFactory.createForClass(AcademicRecord);

// سجل واحد بس لكل طالب في كل سنة
AcademicRecordSchema.index(
  { studentId: 1, academicYear: 1 },
  { unique: true },
);