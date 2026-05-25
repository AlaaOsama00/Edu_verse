import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Group  {
  
  // كل تراك ليه جروب واحد بس (عشان كده unique)
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'Track', 
    required: true, 
    unique: true 
  })
  trackId: Types.ObjectId;

  // الـ Admin بتاع الجروب (طالب واحد بالظبط) - يبقى null لحد ما الأدمن يعين واحد
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    default: null 
  })
  adminId: Types.ObjectId;

  // الأعضاء اللي انضموا للجروب (الطلاب العاديين)
  @Prop({ 
    type: [Types.ObjectId], 
    ref: 'User', 
    default: [] 
  })
  members: Types.ObjectId[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);

