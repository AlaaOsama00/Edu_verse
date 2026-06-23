import { ClubMembershipRepository, ClubRepository, CommentRepository, PostRepository, UserRepository } from '@models/index'
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { ObjectId, Types } from 'mongoose';
import { CreateClubDto } from '../Dto/club/create-club-dto';
import { UserRolesEnum } from '@utils/enum';
import { UpdateClubDto } from '../Dto/club/update-club-dto';
import { CloudinaryService } from 'src/common/multer/cloudinary.service';


@Injectable()
export class ClubService {
    constructor(
        private readonly clubRepo: ClubRepository,
        private readonly userRepository: UserRepository,
        private readonly membershipRepo: ClubMembershipRepository,
        private readonly postRepo: PostRepository,
        private readonly commentRepo: CommentRepository,
                private readonly cloudinaryService: CloudinaryService,


    ) { }

    // ==========================================
    // إنشاء Club جديد (Admin  فقط)
    // ==========================================
    async createClub(dto: CreateClubDto, adminId: string, file?: Express.Multer.File) {
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
        let imageUrl: string | null = null;
        if (file) {
            // تأكدي إنك عاملة inject لـ cloudinaryService في الـ constructor
            const uploadResult = await this.cloudinaryService.uploadFile(
                file,
                'community/clubs', // اسم الفولدر اللي هيتحفظ فيه على كلاوديناري
            );
            imageUrl = uploadResult.secure_url;
        }
        const club = await this.clubRepo.create({
            ...dto,
            createdBy: new Types.ObjectId(adminId),
            imageUrl,
            membersCount: 0,
            rating: 0,
        });

        const clubObj = (club as any).toObject();

        const {  updatedAt, __v, ...clubResponse } = clubObj;

        return clubResponse;
    }

    async getDashboardStats(userRole: UserRolesEnum,userId:ObjectId) {
        // 1. حساب إجمالي عدد المجتمعات
        const totalCommunities = await this.clubRepo.count();
        const allCommunities = await this.clubRepo.find({});
        if (userRole == UserRolesEnum.STUDENT) {
            const memberships = await this.membershipRepo.find({ studentId: userId });
            const memberClubIds = new Set(memberships.map(m => m.clubId.toString()));
            return allCommunities.map((club: any) => {
                const clubObj = club.toObject ? club.toObject() : club;
                return {
                    ...clubObj,
                    isMember: memberClubIds.has(clubObj._id.toString())
                };
            });
        }

        const membersAggregation = await this.clubRepo.aggregate([
            { $group: { _id: null, totalMembers: { $sum: '$membersCount' } } }
        ]);
        const totalMembers = membersAggregation.length > 0 ? membersAggregation[0].totalMembers : 0;

        // 3. حساب المنشورات (كمثال إذا كان لديك موديل للمنشورات)
        const totalPosts = await this.postRepo.count();
        const pinnedPosts = await this.postRepo.count({ isPinned: true });



        // 4. إرجاع البيانات بشكل منظم للفرونت إند
        return {
            communities: {
                count: totalCommunities,
                lists: allCommunities
            },
            totalPosts: {
                count: totalPosts,
            },
            pinnedPosts: {
                count: pinnedPosts,
            },
            totalMembers: {
                count: totalMembers,
            }
        };
    }

    async rateCommunity(clubId: string, userId: string, score: number) {
        // 1. نجيب المجتمع من الداتابيز
        const community = await this.clubRepo.findById(clubId);
        if (!community) {
            throw new NotFoundException('Community not found');
        }

        // 2. نشوف هل الطالب ده قيّم المجتمع ده قبل كده ولا لأ
        const existingRatingIndex = community.ratingsList.findIndex(
            (r) => r.userId === userId
        );

        if (existingRatingIndex > -1) {
            // لو قيّم قبل كده، نحدث التقييم بتاعه
            community.ratingsList[existingRatingIndex].score = score;
        } else {
            // لو مقيمش، نضيف تقييم جديد
            community.ratingsList.push({ userId, score });
        }

        // 3. نحسب المتوسط الجديد (مجموع التقييمات على عددهم)
        const totalScore = community.ratingsList.reduce((sum, current) => sum + current.score, 0);
        const averageRating = totalScore / community.ratingsList.length;

        // 4. نقرب الرقم لعشري واحد (مثلاً 4.5 أو 4.9)
        community.rating = Math.round(averageRating * 10) / 10;

        // 5. نحفظ التعديلات في الداتابيز
        await this.clubRepo.update({
            filter: { _id: community._id }, // شرط البحث
            update: community             // البيانات الجديدة
        });

        return {
            message: 'Club Rated successfully',
            newRating: community.rating
        };
    }

    
    async getTopRatedCommunities() {
        const topCommunities = await this.clubRepo.aggregate([
            // 1. الترتيب تنازلياً (-1) حسب حقل التقييم
            { $sort: { rating: -1 } },

            // 2. إرجاع أول 3 نتائج فقط
            { $limit: 3 }
        ]);

        return topCommunities;
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

    // ==========================================
    // عرض بيانات النادي (Club Info)
    // ==========================================
    async viewClubInfo(clubId: string, userId: string) {
        const clubObjId = new Types.ObjectId(clubId);
        const userObjId = new Types.ObjectId(userId);

        // 1. نجيب بيانات النادي
        const club = await this.clubRepo.findById(clubObjId);
        if (!club) {
            throw new NotFoundException('Club not found');
        }

        // 2. نجيب بيانات المستخدم عشان نعرف هو طالب ولا أدمن
        const user = await this.userRepository.findById(userObjId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        let isMember = "Admin";

        // 3. لو المستخدم طالب، نشيك هل هو عضو في النادي ده ولا لأ
        if (user.role == UserRolesEnum.STUDENT) {
           isMember = "Member"; 
        }

        const clubData = club.toObject ? club.toObject() : JSON.parse(JSON.stringify(club));

        // 4. تعريف الـ Guidelines الثابتة
        const guidelines = "Welcome to our community! Please treat everyone with respect, avoid spamming, stay on topic, and help us keep this space helpful and friendly for everyone.";

        // 5. نرجع البيانات كلها للـ Frontend
        return {
            ...clubData,
            isMember, 
            guidelines, // 👈 ضفنا الـ Guidelines للرد
        };
    }

    async deleteClub(clubId: string) {
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