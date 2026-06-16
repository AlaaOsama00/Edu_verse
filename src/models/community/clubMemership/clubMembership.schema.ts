import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ClubMemberRoleEnum } from '@utils/enum';

@Schema({ timestamps: true })
export class ClubMembership {
  readonly _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  // MEMBER = طالب عادي / ADMIN = اللي بيدير الـ club ويضيف Resources
  @Prop({ type: String, enum: ClubMemberRoleEnum, default: ClubMemberRoleEnum.MEMBER })
  role: ClubMemberRoleEnum;
}

export const ClubMembershipSchema = SchemaFactory.createForClass(ClubMembership);

// الـ constraint الأساسي: طالب ما يتسجلش في نفس الـ club مرتين
ClubMembershipSchema.index(
  { studentId: 1, clubId: 1 },
  { unique: true },
);

// جيب كل members لـ club معين بسرعة (للـ admin)
ClubMembershipSchema.index({ clubId: 1 });

// جيب كل clubs اللي الطالب ده منضم ليها (للـ sidebar)
ClubMembershipSchema.index({ studentId: 1 });