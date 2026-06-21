import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ClubTagEnum } from '@utils/enum';

@Schema({ timestamps: true })
export class Club {
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  name: string; // مثال: CyberCrew

  @Prop({ type: String, required: true })
  description: string;

  // التاجز اللي بتظهر على الكارد زي #Security #Hacking
  @Prop({ type: [String], enum: ClubTagEnum, default: [] })
  tags: ClubTagEnum[];

  // عدد الأعضاء — بيتحدث كل ما حد عمل join أو leave
  // Denormalization عشان نعرضه على الكارد من غير ما نعمل count query
  @Prop({ type: Number, default: 0 })
  membersCount: number;

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  rating: number;
  // rating من 0 لـ 5 (اللي بيظهر على الكارد)
  // ضيفي الجزء ده جوه Community Schema
  @Prop({
    type: [{
      userId: { type: String, required: true },
      score: { type: Number, required: true, min: 1, max: 5 }
    }],
    default: []
  })
  ratingsList: { userId: string, score: number }[];

  
  @Prop({ type: String, required: false })
  imageUrl  : string


}

export const ClubSchema = SchemaFactory.createForClass(Club);

// بحث بالاسم
ClubSchema.index({ name: 'text', description: 'text' });
// فلترة بالـ tags والـ level
ClubSchema.index({ tags: 1 });
