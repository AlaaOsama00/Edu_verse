import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TrackEnum } from '@utils/enum';

@Schema({ timestamps: true })
export class Track {
  
  @Prop({
    type: String,
    required: true,
    unique: true,
    enum: Object.values(TrackEnum)
  })
  name: string;

  @Prop({ type: String })
  description: string;
}

export const TrackSchema = SchemaFactory.createForClass(Track);
