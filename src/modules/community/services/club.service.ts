import { ClubMembershipRepository, ClubRepository, CommentRepository, PostRepository, UserRepository } from '@models/index'
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    ConflictException,
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
        private readonly membershipRepo: ClubMembershipRepository,
        private readonly postRepo: PostRepository,
        private readonly commentRepo: CommentRepository,

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

        const existingClub = await this.clubRepo.findOne({
            filter: {
                name: {
                    $regex: `^${dto.name}$`,
                    $options: 'i' // i = ignore case
                }
            },
        });

        if (existingClub) {
            throw new ConflictException(`Club with name '${dto.name}' already exists`);
        }
        const club = await this.clubRepo.create({
            ...dto,
            createdBy: new Types.ObjectId(adminId),
            membersCount: 0,
            rating: 0,
        });

        const clubObj = (club as any).toObject();

        const { createdAt, updatedAt, __v, ...clubResponse } = clubObj;

        return clubResponse;
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

        const clubObj = (club as any).toObject();

        const { createdAt, updatedAt, __v, ...clubResponse } = clubObj;

        return clubResponse;
    }

    // ==========================================
    // تعديل Club (Admin / Professor فقط)
    // ==========================================
    async updateClubInfo(adminId: string, dto: UpdateClubDto, clubId: string) {
        const club = await this.clubRepo.findById(new Types.ObjectId(clubId));
        const user = await this.userRepository.findById(new Types.ObjectId(adminId))

        if (!club || !user) {
            throw new NotFoundException('Not Found');
        }

        // بس الـ admin اللي أنشأه يقدر يعدله
        if (user.role != UserRolesEnum.ADMIN) {
            throw new ForbiddenException('Forbidden');
        }

        await this.clubRepo.findByIdAndUpdate({
            id: clubId,
            update: { $set: dto },
            options: { new: true },
        });

        return { message: "Updated successfully" }
    }


    async deleteClub( clubId: string) {
        const clubObjId = new Types.ObjectId(clubId);

        // 1. نتأكد إن الكوميونتي موجود أصلاً قبل ما نعمل أي حاجة
        const club = await this.clubRepo.findById(clubObjId);
        if (!club) {
            throw new NotFoundException('Club not found');
        }

        // 2. مسح كل الأعضاء (الميمبرشيب) المربوطين بالكوميونتي ده
        // (عدلي اسم الـ repo حسب ما هو متسمي عندك)
        await this.membershipRepo.deleteMany({ filter: { clubId: clubObjId } });

        // 3. مسح الكومنتات المربوطة ببوستات الكوميونتي ده
        // أولاً: نجيب كل البوستات بتاعة الكوميونتي
        const posts = await this.postRepo.find({ clubId: clubObjId });

        // ثانياً: لو فيه بوستات، نستخرج الـ _id بتاعهم كلهم في مصفوفة
        if (posts.length > 0) {
            const postIds = posts.map(post => post._id);

            // ثالثاً: نمسح كل الكومنتات اللي الـ postId بتاعها موجود جوه المصفوفة دي
            await this.commentRepo.deleteMany({ filter: { postId: { $in: postIds } } });
        }

        await this.postRepo.deleteMany({ filter: { clubId: clubObjId } });

        await this.clubRepo.deleteOne({ filter: { _id: clubObjId } });

        return {
            success: true,
            message: 'Club and all its related data (posts, comments, memberships) have been successfully deleted.',
        };
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