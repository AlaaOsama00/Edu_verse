import { UpdateClubDto } from './Dto/club/update-club-dto';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';
import { ClubService } from './services/club.service';
import { CurrentUser } from '@decorators/userDecorator';
import { CreateClubDto } from './Dto/club/create-club-dto';
import { ClubMembershipService } from './services/clubMembership.service';
import { PostService } from './services/post.service';
import { CreatePostDto } from './Dto/post/create-post-dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCommentDto } from './Dto/comment/create-comment.dto';
import { CommentService } from './services/comment.service';

@Controller('community')
export class CommunityController {
  constructor(
    private readonly clubService: ClubService,
    private readonly membershipService: ClubMembershipService,
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) { }

  // ==========================================
  // CLUBS
  // ==========================================
  // POST /community/clubs — Admin 

  @Post('club')
  @Auth(UserRolesEnum.ADMIN)
  async createClub(@Body() dto: CreateClubDto, @CurrentUser('_id') adminId) {
    return this.clubService.createClub(dto, adminId);
  }

  // GET /community/clubs/:clubId
  @Get('clubs/:clubId')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async viweClubInfo(@CurrentUser('_id') userId, @Param('clubId') clubId: string) {
    return this.clubService.viweClubInfo(userId, clubId);
  }
  // Update /community/clubs/:clubId
  @Patch('clubs/:clubId')
  @Auth(UserRolesEnum.ADMIN)
  async updateClubInfo(@CurrentUser('_id') userId, @Body() dto: UpdateClubDto, @Param('clubId') clubId: string) {
    return this.clubService.updateClubInfo(userId, dto, clubId);
  }


  // ==========================================
  // MEMBERSHIP — Join / Leave
  // ==========================================

  // POST /community/clubs/:clubId/join
  @Post('clubs/:clubId/join')
  @Auth(UserRolesEnum.STUDENT)
  async joinClub(@Param('clubId') clubId: string, @CurrentUser('_id') userId) {
    return this.membershipService.joinClub(clubId, userId);
  }

  // Delete /community/clubs/:clubId/leave
  @Delete('clubs/:clubId/leave')
  @Auth(UserRolesEnum.STUDENT)
  async leaveClub(@Param('clubId') clubId: string, @Req() req) {
    return this.membershipService.leaveClub(clubId, req.user._id);
  }

  // GET /community/clubs/:clubId/members — Admin يشوف الـ members
  @Get('clubs/:clubId/members')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async getMembers(@Param('clubId') clubId: string) {
    return this.membershipService.getClubMembers(clubId);
  }

  // ==========================================
  // POSTS — Members بس
  // ==========================================

  // POST /community/clubs/:clubId/posts
  @Post('clubs/:clubId/posts')
  @Auth(UserRolesEnum.ADMIN,UserRolesEnum.STUDENT)
  @UseInterceptors(FileInterceptor('file')) // 👈 ضفنا الانترسبتور هنا عشان يستقبل الملف
  async createPost(
    @Param('clubId') clubId: string,
    @Body() dto: CreatePostDto,
    @CurrentUser('_id') userId: string,
    @UploadedFile() file?: Express.Multer.File, // 👈 استقبلنا الملف هنا
  ) {
    // 👈 بعتنا الـ file للـ Service
    return this.postService.createPost(clubId, dto, userId, file);
  }

  // GET /community/clubs/:clubId/posts — Feed بتاع الـ club
  @Get('clubs/:clubId/posts')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async getClubPosts(@Param('clubId') clubId: string, @CurrentUser('_id')userId) {
    return this.postService.getClubPosts(clubId,userId);
  }

  // DELETE /community/posts/:postId — صاحب البوست بس
  @Delete('posts/:postId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async deletePost(@Param('postId') postId: string, @CurrentUser('_id')userId) {
    return this.postService.deletePost(postId, userId);
  }

  // POST /community/posts/:postId/like — Toggle Like
  @Post('posts/:postId/like')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async toggleLike(@Param('postId') postId: string, @CurrentUser('_id')userId) {
    return this.postService.toggleLike(postId,userId);
  }

  // ==========================================
  // COMMENTS — Members بس
  // ==========================================

    // POST /community/posts/:postId/comments
  @Post('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('_id')userId,
  ) {
    return this.commentService.addComment(postId, dto,userId);
  }

  // GET /community/posts/:postId/comments
  @Get('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async getComments(@Param('postId') postId: string, @CurrentUser('_id')userId) {
    return this.commentService.getPostComments(postId, userId);
  }

  // DELETE /community/comments/:commentId — صاحب الكومنت بس
  @Delete('comments/:commentId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async deleteComment(@Param('commentId') commentId: string, @CurrentUser('_id')userId) {
    return this.commentService.deleteComment(commentId, userId);
  }
}