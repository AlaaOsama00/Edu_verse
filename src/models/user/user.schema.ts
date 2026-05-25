import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { StatusEnum, UserRolesEnum } from '@utils/enum';
import { Types } from 'mongoose';






@Schema({ timestamps: true }) // Adding createdAt,updatedAt to all users 
export class User {

  readonly _id:  Types.ObjectId// عشان لما نستخدمها في ال repository ما نحتاجش نكتبها تاني

  @Prop({ type: String,required: true })
  fullName: string;

  @Prop({ type: String ,required: true , unique: true})
  email: string;
  
  @Prop({type: String, required: true}) // select: false يعني مش بترجع في أي query عادية
  password: string;
  

  @Prop({ type: String, enum: StatusEnum ,default: StatusEnum.INACTIVE })
  status: StatusEnum; //TO DO

  @Prop({ type: String, default: "Computer Science" })
  department: string; 
  
  @Prop({ type: String, enum: UserRolesEnum })
  role: UserRolesEnum;

  @Prop({
    type: {
      code: { type: String },
      expiresAt: { type: Date },
          },default: null,})
    emailOtp: {code: string ,expiresAt: Date} ;


}

export const UserSchema = SchemaFactory.createForClass(User);



