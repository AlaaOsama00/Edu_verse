import {  Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AcademicYearEnum } from '@utils/enum';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Student {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true, unique: true })
  userId: string; // Reference to the User document

  @Prop({ type: String, required: true, unique: true })
  academicId: string; // #ST-2022-1

  @Prop({ type: String, enum: AcademicYearEnum,default: AcademicYearEnum.YEAR_1 })
  currentYear: AcademicYearEnum; // 4 (Senior)

  
  @Prop({ type: [Types.ObjectId], ref: 'Course', default: [] , maxlength:5 }) 
  currentEnrolledCourses: Types.ObjectId[];//3
}

export const StudentSchema = SchemaFactory.createForClass(Student);



