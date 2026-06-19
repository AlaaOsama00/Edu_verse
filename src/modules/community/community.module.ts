import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Post,Club, ClubSchema,Comment, ClubMembership, ClubMembershipSchema, PostSchema, CommentSchema, User, UserSchema, ClubRepository, ClubResourceRepository, ClubMembershipRepository, PostRepository, CommentRepository, UserRepository } from '@models/index';
import { ClubService } from './services/club.service';
import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { ClubMembershipService } from './services/clubMembership.service';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { CloudinaryService } from 'src/common/multer/cloudinary.service';
import { CommunityGateway } from './community.gateway';



@Module({
  imports: [
    MongooseModule.forFeature([
      // ⚠️ الترتيب هنا مش مهم لـ Mongoose، بس خليناه نفس ترتيب الـ dependency
      { name: Club.name,           schema: ClubSchema           },
      { name: ClubMembership.name, schema: ClubMembershipSchema },
      { name: Post.name,           schema: PostSchema           },
      { name: Comment.name,        schema: CommentSchema        },
      { name: User.name,           schema: UserSchema           },
    ]),
  ],

  controllers: [
  CommunityController       // POST /posts/:postId/comments   → Members فقط
  ],

  providers: [
    // ── Repositories ──
    ClubRepository,
    ClubMembershipRepository,
    PostRepository,
    CommentRepository,
    UserRepository,

    // ── Services ──
    ClubService,
    ClubMembershipService,
    PostService,
    CommentService,
    CloudinaryService,
    CommunityGateway,

    // ── JWT عشان الـ Auth Guard ──
    JwtService,
  ],
})
export class CommunityModule {}