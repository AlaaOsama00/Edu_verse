import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post {
  readonly _id: Types.ObjectId;

  // الـ club اللي البوست ده جوّه — بنتحقق أن الـ author member فيه في الـ Service
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true, index: true })
  clubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  // صورة اختيارية في البوست
  @Prop({ type: String, default: null })
  fileUrl: string;

  @Prop({ type: String, default: null })
  fileType: string; // هيكون فيها 'image', 'pdf', 'video', 'word' ... إلخ

  // الـ likes بنحطهم هنا كـ array of ObjectIds
  // لو الـ likes كتير جداً ممكن نعمل PostLike collection منفصل
  // بس للـ use case ده كده كافي
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likes: Types.ObjectId[];

  // عدد الـ comments — Denormalization عشان نعرضه من غير count query
  @Prop({ type: Number, default: 0 })
  commentsCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Feed بتاع الـ club مرتب من الأحدث للأقدم
PostSchema.index({ clubId: 1, createdAt: -1 });

// بوستات يوزر معين
PostSchema.index({ authorId: 1, createdAt: -1 });