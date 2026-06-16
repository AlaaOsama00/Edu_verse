import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AcademicYearEnum, ActivationEnum, UserRolesEnum } from '@utils/enum';
import { Types } from 'mongoose';






@Schema({ timestamps: true }) // Adding createdAt,updatedAt to all users 
export class User {

  readonly _id: Types.ObjectId// عشان لما نستخدمها في ال repository ما نحتاجش نكتبها تاني

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true }) // select: false يعني مش بترجع في أي query عادية
  password: string;


  @Prop({ type: String, enum: ActivationEnum, default: ActivationEnum.INACTIVE })
  status: ActivationEnum;

  @Prop({ type: String, default: "Computer Science" })
  department: string;

  @Prop({ type: String, enum: UserRolesEnum })
  role: UserRolesEnum;

  @Prop({ type: String, unique: true ,sparse:true})
  academicId: string;

  @Prop({ type: String, enum: AcademicYearEnum})
  currentYear: AcademicYearEnum; // 4 (Senior)

  @Prop({ type: Boolean, default: false })
  isRepeating: boolean; // هل هو معيد سنة؟
  
  @Prop({
    type: {
      code: { type: String },
      expiresAt: { type: Date },
    }, default: null,
  })
  emailOtp: { code: string, expiresAt: Date };


}

export const UserSchema = SchemaFactory.createForClass(User);



