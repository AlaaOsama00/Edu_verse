import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ClubService } from './club.service';
import { ClubMemberRoleEnum } from '@utils/enum';
import { ClubMembershipRepository, ClubRepository } from '@models/index';

@Injectable()
export class ClubMembershipService {
  constructor(
    private readonly membershipRepo: ClubMembershipRepository,
    private readonly clubRepo: ClubRepository,
    private readonly clubService: ClubService, // عشان نستخدم incrementMembersCount
  ) {}

  // ==========================================
  // طالب يعمل Join لـ club
  // ==========================================
  async joinClub(clubId: string, studentId: string) {
    const clubObjId = new Types.ObjectId(clubId);
    const studentObjId = new Types.ObjectId(studentId);

    // 1. تأكد إن الـ club موجود وأكتيف
    const club = await this.clubRepo.findById(clubObjId);
    if (!club) {
      throw new NotFoundException('Not Found');
    }

    const membership = await this.membershipRepo.findOne({
      filter: { studentId: studentObjId, clubId: clubObjId },
    });

   if (membership) {
      throw new ForbiddenException('You are already joined');
    }

     // 3. اعمل الـ membership
    await this.membershipRepo.create({
      studentId: studentObjId,
      clubId: clubObjId,
      role: ClubMemberRoleEnum.MEMBER,
    });

    // 4. زود الـ membersCount في الـ Club بـ 1
    await this.clubService.incrementMembersCount(clubObjId, 1);

    return { message: 'Done' };
  }

  // ==========================================
  // طالب يعمل Leave من club
  // ==========================================
  async leaveClub(clubId: string, studentId: string) {
    const clubObjId = new Types.ObjectId(clubId);
    const studentObjId = new Types.ObjectId(studentId);

    // 1. تأكد إنه member فعلاً
    const membership = await this.membershipRepo.findOne({
      filter: { studentId: studentObjId, clubId: clubObjId },
    });

   if (!membership) {
      throw new ForbiddenException('You are already not a member of this club');
    }
    // 2. امسح الـ membership
    await this.membershipRepo.findByIdAndDelete({ id: membership._id });

    // 3. نقص الـ membersCount في الـ Club بـ 1
    await this.clubService.incrementMembersCount(clubObjId, -1);

    return { message: 'Done' };
  }


  // =====================
  // جيب كل members لـ 
  // =====================
  async getClubMembers(clubId: string) {
    return this.membershipRepo.find({
       clubId: new Types.ObjectId(clubId) ,
    });
  }


 
}

