/*import { ClubRepository, ClubMembershipRepository, UserRepository } from '@models/index';
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateClubDto } from '../Dto/club/create-club-dto';
import { UserRolesEnum } from '@utils/enum';
import { ExploreClubsDto } from '../Dto/club/get-clubs-dto';


@Injectable()
export class ClubService {
    constructor(
        private readonly clubRepo: ClubRepository,
        private readonly membershipRepo: ClubMembershipRepository,
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
            activeTracksCount: 0,
            rating: 0,
        });

        return club;
    }

    // ==========================================
    // Explore Page — جيب كل الـ clubs مع فلترة
    //هيسرش ويطلع الكلب ويقوله هو ميمبر ول لا عشان يشوف الزرار هيبقي (joined-join)
    // ==========================================
    async searchOnClubs(dto: ExploreClubsDto, studentId: string) {
        
        const filter: any = { isActive: true };

        // فلترة بالـ tag لو موجود
        if (dto.tag) {
            filter.tags = dto.tag;
        }

        // بحث بالاسم أو الوصف
        if (dto.search) {
            filter.$text = { $search: dto.search };
        }

        const clubs = await this.clubRepo.find(filter);

        // جيب الـ clubs اللي الطالب ده منضم ليها عشان نعرف نعرض Join أو Joined
        const studentObjId = new Types.ObjectId(studentId);
        const myMemberships = await this.membershipRepo.find({
            filter: { studentId: studentObjId },
        });

        const myClubIds = new Set(
            myMemberships.map((m) => m.clubId.toString()),
        );

        // نضيف flag على كل club — هل الطالب ده member فيه ولا لا
        return clubs.map((club) => ({
            ...club.toObject(),
            isJoined: myClubIds.has(club._id.toString()),
        }));
    }

    // ==========================================
    // جيب club واحد بالتفاصيل
    // ==========================================
    async getClubById(clubId: string) {
        const club = await this.clubRepo.findById(new Types.ObjectId(clubId));

        if (!club) {
            throw new NotFoundException('Doesnot Exist');
        }

        return club;
    }

    // ==========================================
    // تعديل Club (Admin / Professor فقط)
    // ==========================================
    // async updateClub(clubId: string, dto: Partial<CreateClubDto>, adminId: string) {
    //     const club = await this.clubRepo.findById(new Types.ObjectId(clubId));

    //     if (!club) {
    //         throw new NotFoundException('Not Found');
    //     }

    //     // بس الـ admin اللي أنشأه يقدر يعدله
    //     if (club.createdBy.toString() !== adminId) {
    //         throw new ForbiddenException('مش مسموحلك تعدل الـ Club ده');
    //     }

    //     return this.clubRepo.findByIdAndUpdate({
    //         id: clubId,
    //         update: { $set: dto },
    //         options: { new: true },
    //     });
    // }

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
}*/