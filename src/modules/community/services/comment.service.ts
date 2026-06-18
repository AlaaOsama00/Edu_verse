import { UserRolesEnum } from '@utils/enum';
import { Injectable, NotFoundException, ForbiddenException} from '@nestjs/common';
import { Types } from 'mongoose';
import { PostService } from './post.service';
import { ClubMembershipService } from './clubMembership.service';
import { CommunityGateway } from '../community.gateway';
import { ClubMembershipRepository, CommentRepository, UserRepository } from '@models/index';
import { CreateCommentDto } from '../Dto/comment/create-comment.dto';

@Injectable()
export class CommentService {
    constructor(
        private readonly commentRepo: CommentRepository,
        private readonly postService: PostService,             // عشان getPostOrThrow و incrementCommentsCount
        private readonly membershipRepo: ClubMembershipRepository,             // عشان نبعت الـ real-time events
        private readonly gateway: CommunityGateway,             // عشان نبعت الـ real-time events
        private readonly userRepository: UserRepository
    ) { }

    // ==========================================
    // Member يضيف Comment على بوست
    // ==========================================
    async addComment(postId: string, dto: CreateCommentDto, authorId: string) {
        const postObjId = new Types.ObjectId(postId);
        const authorObjId = new Types.ObjectId(authorId);

        // 1. جيب البوست عشان نعرف الـ clubId
        const post = await this.postService.getPostOrThrow(postObjId);

        const membership = await this.membershipRepo.findOne({
            filter: { studentId: authorObjId, clubId: post.clubId },
        });

        if (!membership) {
            throw new ForbiddenException('You must be a member of this club to perform this action');
        }
        // 3. اعمل الـ Comment
        const comment = await this.commentRepo.create({
            postId: postObjId,
            clubId: post.clubId,   // بنحفظه هنا Denormalization عشان منحتاجش نرجع للـ Post تاني
            authorId: authorObjId,
            content: dto.content,
        });

        // 4. زود الـ commentsCount في الـ Post بـ 1
        await this.postService.incrementCommentsCount(postObjId, 1);

        // 5. 📡 بلّغ كل أعضاء الـ Club إن فيه كومنت جديد على البوست ده
        //    ده اللي بيخلي الكومنت يظهر فوراً عند كل الناس الفاتحة الصفحة
        await this.gateway.emitNewComment(post.clubId.toString(), postId, comment);

        return comment;
    }

    // ==========================================
    // جيب كل Comments لبوست معين
    // ==========================================
    async getPostComments(postId: string, userId: string) {
        const postObjId = new Types.ObjectId(postId);
        const userObjId = new Types.ObjectId(userId);

        // 1. جيب البوست عشان نعرف الـ clubId
        const post = await this.postService.getPostOrThrow(postObjId);

        const membership = await this.membershipRepo.findOne({
            filter: { studentId: userObjId, clubId: post.clubId },
        });

        if (!membership) {
            throw new ForbiddenException('You must be a member of this club to perform this action');
        }

        return this.commentRepo.find(
            { postId: postObjId },
            { sort: { createdAt: -1 } }, // الأقدم الأول (ترتيب طبيعي للكومنتات)
        );
    }

    // ==========================================
    // حذف Comment (صاحب الكومنت بس)
    // ==========================================
    async deleteComment(commentId: string, userId: string) {
        const userObjId = new Types.ObjectId(userId) 
        const user = await this.userRepository.findById(userObjId);
        if (!user) {
            throw new NotFoundException("User Not Found");
        }
     
        const comment = await this.commentRepo.findById(commentId);

        if (!comment) {
            throw new NotFoundException('comment not found');
        }

        // بس صاحب الكومنت يقدر يمسحه
        if (user.role==UserRolesEnum.STUDENT &&comment.authorId.toString() !== userId) {
            throw new ForbiddenException('Unauthorized');
        }

        await this.commentRepo.findByIdAndDelete({ id: commentId });

        // نقص الـ commentsCount في الـ Post بـ 1
        await this.postService.incrementCommentsCount(comment.postId, -1);

        return { message: 'comment deleted successfully' };
    }
}