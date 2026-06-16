/*import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Post,Club, ClubSchema, ClubResource, ClubResourceSchema, ClubMembership, ClubMembershipSchema, PostSchema, CommentSchema, User, UserSchema, ClubRepository, ClubResourceRepository, ClubMembershipRepository, PostRepository, CommentRepository, UserRepository } from '@models/index';
import { ClubService } from './services/club.service';
import { Module } from '@nestjs/common';



@Module({
  imports: [
    MongooseModule.forFeature([
      // ⚠️ الترتيب هنا مش مهم لـ Mongoose، بس خليناه نفس ترتيب الـ dependency
      { name: Club.name,           schema: ClubSchema           },
      { name: ClubResource.name,   schema: ClubResourceSchema   },
      { name: ClubMembership.name, schema: ClubMembershipSchema },
      { name: Post.name,           schema: PostSchema           },
      { name: Comment.name,        schema: CommentSchema        },
      { name: User.name,           schema: UserSchema           },
    ]),
  ],

  controllers: [
    ClubController,
    ClubResourceController,   // POST /clubs/:clubId/resources  → Admin فقط
    ClubMembershipController, // POST /clubs/:clubId/join       → أي طالب
    PostController,           // POST /clubs/:clubId/posts      → Members فقط
    CommentController,        // POST /posts/:postId/comments   → Members فقط
  ],

  providers: [
    // ── Repositories ──
    ClubRepository,
    ClubResourceRepository,
    ClubMembershipRepository,
    PostRepository,
    CommentRepository,
    UserRepository,

    // ── Services ──
    ClubService,
    ClubResourceService,
    ClubMembershipService,
    PostService,
    CommentService,

    // ── JWT عشان الـ Auth Guard ──
    JwtService,
  ],
})
export class CommunityModule {}*/