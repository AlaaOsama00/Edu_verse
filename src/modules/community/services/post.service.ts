import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CloudinaryService } from 'src/common/multer/cloudinary.service';
import { ClubMembershipRepository, PostRepository, UserRepository } from '@models/index';
import { CreatePostDto } from '../Dto/post/create-post-dto';
import { UserRolesEnum } from '@utils/enum';
import { CommunityGateway } from '../community.gateway';



@Injectable()
export class PostService {
    constructor(
        private readonly postRepo: PostRepository,
        private readonly membershipRepo: ClubMembershipRepository, // عشان assertIsMember
        private readonly cloudinaryService: CloudinaryService,
        private readonly userRepository: UserRepository,
        private readonly gateway: CommunityGateway, // عشان نبعت الـ real-time events

    ) { }

    // ==========================================
    // Member يعمل Post جديد في الـ Club
    // ممكن يبعت: content بس / content + imageUrl / content + file مرفوع
    // ==========================================
    async createPost(clubId: string, dto: CreatePostDto, authorId: string, file?: Express.Multer.File) {
        const clubObjId = new Types.ObjectId(clubId);
        const authorObjId = new Types.ObjectId(authorId);

        const user = await this.userRepository.findById(authorObjId);
        if (!user) {
            throw new NotFoundException("User Not Found");
        }

        if (user.role == UserRolesEnum.STUDENT) {
            const membership = await this.membershipRepo.findOne({
                filter: { studentId: authorObjId, clubId: clubObjId }, // ⚠️ خلي بالك كانت authorId وعدلتها لـ studentId زي ما عملنا قبل كده
            });

            if (!membership) {
                throw new ForbiddenException('You must be a member of this club to perform this action');
            }
        }

        if (file && dto.url) {
            throw new BadRequestException('You can either upload a file or provide a URL, but not both');
        }
        // هنسميها mediaUrl في الداتا بيز عشان تعبر عن أي ميديا (صورة، ملف، لينك)
        let mediaUrl: string | null = dto.url ?? null;

        // لو فيه ملف مرفوع، نرفعه على Cloudinary ونستبدل الـ url
        if (file) {
            const uploadResult = await this.cloudinaryService.uploadFile(
                file,
                'community/posts',
            );
            mediaUrl = uploadResult.secure_url;
        }

        const post = await this.postRepo.create({
            clubId: clubObjId,
            authorId: authorObjId,
            content: dto.content,
            mediaUrl, // 👈 غيرنا دي هنا (لازم تتغير في الـ Schema كمان)
            likes: [],
            commentsCount: 0,
        });

        // 📡 بلّغ كل أعضاء الـ Club إن فيه بوست جديد
         this.gateway.emitNewPost(clubId, post);

        return post;
    }

    // ==========================================
    // Feed بتاع الـ Club — جيب كل البوستات
    // ==========================================
    async getClubPosts(clubId: string, userId: string) {
        const clubObjId = new Types.ObjectId(clubId);
        const userObjId = new Types.ObjectId(userId);
        const user = await this.userRepository.findById(userObjId);
        if (!user) {
            throw new NotFoundException("User Not Found");
        }

        const membership = await this.membershipRepo.findOne({
            filter: { studentId: userObjId, clubId: clubObjId },
        });

        if (user.role == UserRolesEnum.STUDENT && !membership) {
            throw new ForbiddenException('You must be a member of this club to perform this action');
        }
        const posts = await this.postRepo.find(
            { clubId: clubObjId },
            {},
            { sort: { createdAt: -1 } }, // الأحدث الأول
        );

        // نضيف flag: هل اليوزر ده عمل Like على البوست ده؟
        return posts.map((post) => ({
            ...post.toObject(),
            isLiked: post.likes.some((id) => id.toString() === userId),
            likesCount: post.likes.length,
        }));
    }

    // ==========================================
    // Like / Unlike على بوست
    // ==========================================
    async toggleLike(postId: string, userId: string) {
        const postObjId = new Types.ObjectId(postId);
        const userObjId = new Types.ObjectId(userId);
        const user = await this.userRepository.findById(userObjId);
        if (!user) {
            throw new NotFoundException("User Not Found");
        }
        const post = await this.postRepo.findById(postObjId);
        if (!post) {
            throw new NotFoundException('Not found');
        }

        const membership = await this.membershipRepo.findOne({
            filter: { studentId: userObjId, clubId: post.clubId },
        });

        if (user.role == UserRolesEnum.STUDENT && !membership) {
            throw new ForbiddenException('You must be a member of this club to perform this action');
        }

        const alreadyLiked = post.likes.some((id) => id.toString() === userId);

        let updatedPost;
        let isLikedNow: boolean;

        if (alreadyLiked) {
            // Unlike — شيل الـ userId من الـ array
            updatedPost = await this.postRepo.findByIdAndUpdate({
                id: postObjId,
                update: { $pull: { likes: userObjId } },
                options: { new: true }, // مهم — عشان نرجع العدد الجديد بعد التحديث
            });
            isLikedNow = false;
        } else {
            // Like — ضيف الـ userId على الـ array
            updatedPost = await this.postRepo.findByIdAndUpdate({
                id: postObjId,
                update: { $addToSet: { likes: userObjId } },
                options: { new: true },
            });
            isLikedNow = true;
        }

        const likesCount = updatedPost.likes.length;

        if (isLikedNow) {
            await this.gateway.emitLikeUpdate(
                post.clubId.toString(),
                postId,
                likesCount,
                isLikedNow,
                userId,
            );
        }

        return { message: isLikedNow ? 'Like Done' : 'Like Removed ', likesCount };
    }

    // ==========================================
    // حذف البوست (صاحب البوست بس)
    // ==========================================
    async deletePost(postId: string, userId: string) {
        const postObjId = new Types.ObjectId(postId);
        const userObjId = new Types.ObjectId(userId);
        const user = await this.userRepository.findById(userObjId);
        if (!user) {
            throw new NotFoundException("User Not Found");
        }
        const post = await this.postRepo.findById(postObjId);
        if (!post) {
            throw new NotFoundException('Not found');
        }
        // بس صاحب البوست يقدر يمسحه
        if (user.role == UserRolesEnum.STUDENT && post.authorId.toString() != userId) {
            throw new ForbiddenException('Unauthorized');
        }

        // لو الصورة كانت مرفوعة على Cloudinary (مش رابط خارجي)، نمسحها من هناك كمان
        if (post.mediaUrl && post.mediaUrl.includes('cloudinary.com')) {
            const publicId = this.cloudinaryService.extractPublicId(post.mediaUrl);
            if (publicId) {
                await this.cloudinaryService.deleteFile(publicId);
            }
        }

        await this.postRepo.findByIdAndDelete({ id: postId });

        // 📡 بلّغ الكل إن البوست ده اتمسح عشان يشيلوه من الشاشة فوراً
        await this.gateway.emitPostDeleted(post.clubId.toString(), postId);

        return { message: 'Post deleted Successfully' };
    }


    // ==========================================
    // Admin يعمل Pin لبوست — يظهر في Useful Resources
    // ==========================================
    async pinPost(postId: string, adminId: string) {
        const postObjId = new Types.ObjectId(postId);
        const adminObjId = new Types.ObjectId(adminId);

        const post = await this.postRepo.findById(postObjId);
        if (!post) {
            throw new NotFoundException('Does not exist');
        }

        const admin = await this.userRepository.findById(adminObjId);
        if (!admin || admin.role != UserRolesEnum.ADMIN) {
            throw new UnauthorizedException("Unauthorized")
        }
        if (post.isPinned) {
            throw new BadRequestException('This post is already pinned');
        }

        const updatedPost = await this.postRepo.findByIdAndUpdate({
            id: postObjId,
            update: {
                $set: {
                    isPinned: true,
                    pinnedBy: adminObjId,
                    pinnedAt: new Date(),
                },
            },
            options: { new: true },
        });

        // 📡 بلّغ الكل إن فيه Resource جديدة ظهرت
       this.gateway.emitPostPinned(post.clubId.toString(), updatedPost);

        return updatedPost;
    }

    // ==========================================
    // Admin يشيل الـ Pin من بوست
    // ==========================================
    async unpinPost(postId: string, adminId: string) {
        const postObjId = new Types.ObjectId(postId);
        const adminObjId = new Types.ObjectId(adminId);

        const post = await this.postRepo.findById(postObjId);
        if (!post) {
            throw new NotFoundException('post noy found');
        }

        const admin = await this.userRepository.findById(adminObjId);
        if (!admin || admin.role != UserRolesEnum.ADMIN) {
            throw new UnauthorizedException("Unauthorized")
        }

        if (!post.isPinned) {
            throw new BadRequestException('This post is already pinned');
        }

        await this.postRepo.findByIdAndUpdate({
            id: postObjId,
            update: {
                $set: { isPinned: false, pinnedBy: null, pinnedAt: null },
            },
        });

         this.gateway.emitPostUnpinned(post.clubId.toString(), postId);

        return { message: 'Admin unpinned this post' };
    }

    // ==========================================
    // جيب كل الـ Pinned posts بتاعة Club معين
    // ده اللي بيظهر في خانة Useful Resources كـ preview صغير
    // ==========================================
    async getPinnedPosts(clubId: string, userId: string) {
        const clubObjId = new Types.ObjectId(clubId);
        const userObjId = new Types.ObjectId(userId);

         const membership = await this.membershipRepo.findOne({
            filter: { studentId: userObjId, clubId: clubObjId },
        });
        if (!membership) {
                throw new ForbiddenException('You must be a member of this club to perform this action');
            }

        const pinnedPosts = await this.postRepo.find(
            { clubId: clubObjId, isPinned: true },
            {},
            { sort: { pinnedAt: -1 } }, // الأحدث pin الأول
        );

        // بنرجع نسخة "Preview" بس — مش البوست كامل
        // الـ Frontend هيستخدمها في خانة Useful Resources الصغيرة
        return pinnedPosts.map((post) => ({
            postId: post._id,
            preview: this.buildPreviewText(post.content),
            hasImage: !!post.mediaUrl,
            pinnedAt: post.pinnedAt,
        }));
    }





    // ==========================================
    // Helper — بيقص المحتوى لأول كلمات قليلة بس
    // عشان يبقى زي الـ preview في واتساب
    // ==========================================
    private buildPreviewText(content: string, maxLength: number = 60): string {
        if (content.length <= maxLength) return content;
        return content.slice(0, maxLength).trim() + '...';
    }


        // ==========================================
    // Helper داخلي — بيستخدمه CommentService
    // عشان يجيب الـ clubId من البوست من غير ما يعمل query تاني
    // ==========================================
    async getPostOrThrow(postId: Types.ObjectId) {
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw new NotFoundException('Not found');
        }
        return post;
    }

    // ==========================================
    // Helper داخلي — بيستخدمه CommentService
    // عشان يزود الـ commentsCount بعد ما يتضاف كومنت
    // ==========================================
    async incrementCommentsCount(postId: Types.ObjectId, value: 1 | -1) {
        await this.postRepo.findByIdAndUpdate({
            id: postId,
            update: { $inc: { commentsCount: value } },
        });
    }

}