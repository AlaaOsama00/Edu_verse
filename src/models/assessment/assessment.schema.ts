import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AssessmentTypeEnum } from '@utils/enum';
import { Document, Types } from 'mongoose';

export type AssessmentDocument = Assessment & Document;


@Schema({ timestamps: true })
export class Assessment {
  // ==========================================
  // 1. بيانات أساسية (لازم تتملأ في أي حال)
  // ==========================================
  readonly _id: Types.ObjectId; 

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId; // المادة بتاعة التقييم ده

  @Prop({ type: String, required: true, enum: AssessmentTypeEnum })
  type: AssessmentTypeEnum; // هو ايه؟ (أسيجمنت ولا ميدترم؟)

  @Prop({ type: String, required: true })
  name: string; // اسمه إيه؟ (مثال: "Assignment 1" أو "Midterm Exam")

  @Prop({ type: Number, required: true })
  maxMark: number; // الدرجة العظمى (مثال: 10 للأسيجمنت، 40 للميدترم)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdByProf: Types.ObjectId; // الدكتور اللي عمله

  // ==========================================
  // 2. بيانات خاصة بالأسيجمنت فقط (اختيارية)
  // ==========================================
  // لو النوع MIDTERM، دي هتبقى Null ومش هتأثر على حاجة
  
  @Prop({ type: String, default: null })
  description: string; // وصف الواجب (الامتحان مش بيحتاج وصف عادة)

  @Prop({ type: Date, default: null })
  deadline: Date; // موعد التسليم (الميدترم مافيش ليه موعد تسليم، الطالب بيجي يمتحن)

}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

// إنديكس عشان نوصل للتقييمات بتاعة مادة معينة بسرعة
AssessmentSchema.index({ courseId: 1, type: 1 }); 