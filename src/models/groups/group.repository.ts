import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group } from '@models/groups/group.schema';
import { AbstractRepository } from '@models/abstract.repository';


@Injectable()
export class GroupRepository extends AbstractRepository<Group> {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {
    super(groupModel)
  }

  // جيب الجروب بتاع تراك معين
  async findByTrackId(trackId: Types.ObjectId): Promise<Group | null> {
    return this.groupModel.findOne({ trackId }).exec();
  }

  // جيب الجروب بالـ ID مع تحميل بيانات الأعضاء (لاستخدامها في الشات)
  async findGroupWithMembers(groupId: Types.ObjectId): Promise<Group | null> {
    return this.groupModel.findById(groupId).populate('members').exec();
  }

  // عين الطالب ده كـ Group Admin (الbusiness rule بتقول: واحد بس)
  async assignGroupAdmin(groupId: Types.ObjectId, userId: Types.ObjectId|string): Promise<Group | null> {
    return this.groupModel
      .findByIdAndUpdate(groupId, { adminId: userId }, { new: true })
      .exec();
  }

  // الطالب ينضم للجروب (نضيفه في الـ Array)
  async addMember(groupId: Types.ObjectId, userId: Types.ObjectId|string): Promise<Group | null> {
    return this.groupModel
      .findByIdAndUpdate(groupId, { $addToSet: { members: userId } }, { new: true })
      // $addToSet أحسن من $push عشان ميدخلش نفس الطالب مرتين
      .exec();
  }

  // الطالب يخرج من الجروب
  async removeMember(groupId: Types.ObjectId, userId: Types.ObjectId|string): Promise<Group | null> {
    return this.groupModel
      .findByIdAndUpdate(groupId, { $pull: { members: userId } }, { new: true })
      .exec();
  }

  // انشاء جروب جديد لما الأدمن يعمل تراك جديد
  async create(trackId: Types.ObjectId): Promise<Group> {
    const newGroup = new this.groupModel({ trackId });
    return newGroup.save();
  }
}