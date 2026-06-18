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
  @Prop({ type: String,required: false, default: null })
  mediaUrl: string;

  // الـ likes بنحطهم هنا كـ array of ObjectIds
  // لو الـ likes كتير جداً ممكن نعمل PostLike collection منفصل
  // بس للـ use case ده كده كافي
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likes: Types.ObjectId[];

  // عدد الـ comments — Denormalization عشان نعرضه من غير count query
  @Prop({ type: Number, default: 0 })
  commentsCount: number;

   @Prop({ type: Boolean, default: false, index: true })
  isPinned: boolean;
 
  // مين عمل الـ Pin (Admin) — عشان نعرف نوثق العملية ونسمح بالـ Unpin
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  pinnedBy: Types.ObjectId | null;
 
  // امتى اتعمل الـ Pin — بنستخدمه عشان نرتب الـ Resources بالأحدث
  @Prop({ type: Date, default: null })
  pinnedAt: Date | null;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Feed بتاع الـ club مرتب من الأحدث للأقدم
PostSchema.index({ clubId: 1, createdAt: -1 });

// بوستات يوزر معين
PostSchema.index({ authorId: 1, createdAt: -1 });

PostSchema.index({ clubId: 1, isPinned: 1, pinnedAt: -1 });