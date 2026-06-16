import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ClubResourceTypeEnum } from '@utils/enum';

@Schema({ timestamps: true })
export class ClubResource {
  readonly _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true, index: true })
  clubId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string; // مثال: Course Materials / Lecture Slides

  // PDF / VideoStream / GithubRepo / Link
  @Prop({ type: String, enum: ClubResourceTypeEnum, required: true })
  type: ClubResourceTypeEnum;

  // الـ subtitle اللي بيظهر تحت الـ title زي "PDF, 12MB" أو "Week 1-6"
  @Prop({ type: String, default: '' })
  subtitle: string;

  @Prop({ type: String, required: true })
  url: string;

  // الـ Admin اللي أضاف الـ resource (PROFESSOR أو ADMIN بس)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;
}

export const ClubResourceSchema = SchemaFactory.createForClass(ClubResource);

// جيب كل resources لـ club معين بسرعة
ClubResourceSchema.index({ clubId: 1, createdAt: -1 });