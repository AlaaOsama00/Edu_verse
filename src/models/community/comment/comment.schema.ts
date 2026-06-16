import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment {
  readonly _id: Types.ObjectId;

  // الـ post اللي الكومنت ده عليه
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  // محتاجينه هنا عشان نتحقق إن الـ commenter member في نفس الـ club بتاع الـ post
  // بدل ما نعمل populate للـ post عشان نجيب الـ clubId
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// كل كومنتات بوست معين مرتبة من الأقدم للأحدث
CommentSchema.index({ postId: 1, createdAt: 1 });