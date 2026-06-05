import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { IMarks } from '@interfaces/index';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Course {

  _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  code: string; // مثال: CS-402

  @Prop({ type: String, required: true })
  name: string; // مثال: Advanced Machine Learning

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, default: "Computer Science" })
  department: string; 

  @Prop({ type: Number, required: true })
  creditHours: number;

  @Prop({ type: Boolean, default: false })
  isTraining: boolean; // هنعمل ماده بكود اسمها التدريب الصيفي عشان تنزل للطلاب في التسجيل 

  // توزيع الدرجات الخاص بالمادة (ثابت للمادة دي)
  @Prop({
    type: { 
      midterm: Number, 
      final: Number, 
      practical: Number, 
      assignment1: Number, 
      assignment2: Number 
    },
    required: true,
    _id: false, 
  })
  marksDistribution: IMarks; 
}

export const CourseSchema = SchemaFactory.createForClass(Course);

