import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SemesterEnum, AcademicYearEnum } from '@utils/enum';
import type { IMarks } from '@interfaces/IMarks';



@Schema({ timestamps: true })
export class Course {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  code: string; // CS-402  ==> (4 --> refers to course level, 2 --> refers to track number)

  @Prop({ type: String, required: true })
  name: string; // Advanced Machine Learning

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true })
  creditHours: number;

  @Prop({ type: String, required: true, enum: AcademicYearEnum })
  academicYear: AcademicYearEnum; // الكورس ده لتالة أي سنة؟ (1, 2, 3, 4)

  // الكورس ده بيتدرس في فصل انهي؟ (مفيش SUMMER هنا لأن الكورس نفسه ثابت)
  @Prop({ type: String, required: true, enum: [SemesterEnum.First, SemesterEnum.Second] })
  semester: SemesterEnum;

  // استخدمنا الـ Interface اللي عملناها في الـ Utils عشان نضمن التوزيع الصح
  @Prop({
    type: { midterm: Number, final: Number, practical: Number, project: Number },
    required: true
  })
  marksDistribution: IMarks;

}



export const CourseSchema = SchemaFactory.createForClass(Course);

CourseSchema.index({ targetYear: 1, targetSemester: 1 });
