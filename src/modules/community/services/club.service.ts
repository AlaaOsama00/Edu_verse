import { ClubRepository, UserRepository } from '@models/index'
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateClubDto } from '../Dto/club/create-club-dto';
import { UserRolesEnum } from '@utils/enum';
import { UpdateClubDto } from '../Dto/club/update-club-dto';


@Injectable()
export class ClubService {
    constructor(
        private readonly clubRepo: ClubRepository,
        private readonly userRepository: UserRepository,
    ) { }

    // ==========================================
    // إنشاء Club جديد (Admin  فقط)
    // ==========================================
    async createClub(dto: CreateClubDto, adminId: string) {
        const adminIdObj = new Types.ObjectId(adminId)
        const user = await this.userRepository.findById(adminIdObj)

        if (!user || user.role != UserRolesEnum.ADMIN) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const club = await this.clubRepo.create({
            ...dto,
            createdBy: new Types.ObjectId(adminId),
            membersCount: 0,
            rating: 0,
        });

        return club;
    }

    // ==========================================
    // جيب club واحد بالتفاصيل
    // ==========================================
    async viweClubInfo(userId: string, clubId: string) {
        const club = await this.clubRepo.findById(new Types.ObjectId(clubId));
        const user = await this.userRepository.findById(new Types.ObjectId(userId))
        if (!club || !user) {
            throw new NotFoundException('Not Found');
        }

        if (user.role !== UserRolesEnum.STUDENT && user.role !== UserRolesEnum.ADMIN) {
            throw new UnauthorizedException("Unauthorized")
        }

        return club;
    }

    // ==========================================
    // تعديل Club (Admin / Professor فقط)
    // ==========================================
    async updateClubInfo(adminId: string, dto: UpdateClubDto, clubId: string) {
        const club = await this.clubRepo.findById(new Types.ObjectId(clubId));
        const user =await this.userRepository.findById(new Types.ObjectId(adminId))

        if (!club||!user) {
            throw new NotFoundException('Not Found');
        }

        // بس الـ admin اللي أنشأه يقدر يعدله
        if (user.role!=UserRolesEnum.ADMIN) {
            throw new ForbiddenException('Forbidden');
        }

        return this.clubRepo.findByIdAndUpdate({
            id: clubId,
            update: { $set: dto },
            options: { new: true },
        });
    }

    // ==========================================
    // Helper داخلي — بيستخدمه ClubMembershipService
    // عشان يزود أو ينقص الـ membersCount
    // ==========================================
    async incrementMembersCount(clubId: Types.ObjectId, value: 1 | -1) {
        await this.clubRepo.findByIdAndUpdate({
            id: clubId,
            update: { $inc: { membersCount: value } },
        });
    }
}