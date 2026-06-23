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
import { RateCommunityDto } from './Dto/club/rate-community.dto';
import { UpdatePostDto } from './Dto/post/UpdatePostDto';

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

  @Post('create-club')
  @Auth(UserRolesEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file')) // 👈 ضفنا الانترسبتور هنا عشان يستقبل الملف
  async createClub(@Body() dto: CreateClubDto, @CurrentUser('_id') adminId, @UploadedFile() file?: Express.Multer.File) {
    return this.clubService.createClub(dto, adminId, file);
  }

  @Get('status')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async getStats(@Req() req: any) {
    const role = req.user.role;
    const userId= req.user._id;
    const stats = await this.clubService.getDashboardStats(role,userId);
    return {
      data: stats,
    };
  }
  @Post(':clubId/rate')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async rateCommunity(
    @Param('clubId') communityId: string,
    @Body() body: RateCommunityDto,
    @Req() req: any
  ) {
    // بنجيب الـ id بتاع الطالب من التوكن (تأكدي من اسم الحقل حسب التوكن بتاعك)
    const userId = req.user.id;
    return this.clubService.rateCommunity(communityId, userId, body.score);
  }
  @Get('top-rated')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async getTopRated() {
    const data = await this.clubService.getTopRatedCommunities();

    return {
      message: 'Top 3 communities fetched successfully',
      count: data.length,
      data: data,
    };
  }
 
  // Update /community/clubs/:clubId
  @Patch('clubs/:clubId')
  @Auth(UserRolesEnum.ADMIN)
  async updateClubInfo(@CurrentUser('_id') userId, @Body() dto: UpdateClubDto, @Param('clubId') clubId: string) {
    return this.clubService.updateClubInfo(userId, dto, clubId);
  }

  @Delete('clubs/:clubId')
  @Auth(UserRolesEnum.ADMIN)
  async deleteClub(@Param('clubId') clubId: string) {
    return this.clubService.deleteClub(clubId);
  }

  // GET /clubs/:clubId
  @Get(':clubId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN) // مسموح للطلاب والأدمن يشوفوا معلومات النادي
  async viewClubInfo(
    @Param('clubId') clubId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.clubService.viewClubInfo(clubId, userId);
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
  @Post('clubs/:clubId/post')
  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
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
  


  // GET /community/club/:clubId/posts — Feed بتاع الـ club
  @Get('club/:clubId/posts')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async getClubPosts(@Param('clubId') clubId: string, @CurrentUser('_id') userId) {
    return this.postService.getClubPosts(clubId, userId);
  }

  @Patch('post/:postId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async updatePost(
    @Param('postId') postId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: UpdatePostDto, 
  ) {
    return this.postService.updatePost(postId, userId, dto);
  }

  // DELETE /community/post/:postId — صاحب البوست بس
  @Delete('post/:postId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async deletePost(@Param('postId') postId: string, @CurrentUser('_id') userId) {
    return this.postService.deletePost(postId, userId);
  }

  // POST /community/post/:postId/like — Toggle Like
  @Post('post/:postId/like')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async toggleLike(@Param('postId') postId: string, @CurrentUser('_id') userId) {
    return this.postService.toggleLike(postId, userId);
  }

  @Patch('post/:postId/pin')
  @Auth(UserRolesEnum.ADMIN) // صلاحية للـ Admin بس
  async pinPost(
    @Param('postId') postId: string,
    @CurrentUser('_id') adminId: string,
  ) {
    return this.postService.pinPost(postId, adminId);
  }

  @Patch('post/:postId/unpin')
  @Auth(UserRolesEnum.ADMIN) // صلاحية للـ Admin بس
  async unpinPost(
    @Param('postId') postId: string,
    @CurrentUser('_id') adminId: string,
  ) {
    return this.postService.unpinPost(postId, adminId);
  }

  @Get('club/:clubId/pinned-posts')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN) // صلاحية للطلاب والأدمن
  async getPinnedPosts(
    @Param('clubId') clubId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.postService.getPinnedPosts(clubId, userId);
  }

  // GET /posts/:postId
  @Get('posts/:postId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async getPostById(
    @Param('postId') postId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.postService.getPostById(postId, userId);
  }

  // ==========================================
  // COMMENTS — Members بس
  // ==========================================

  // POST /community/posts/:postId/comments
  @Post('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('_id') userId,
  ) {
    return this.commentService.addComment(postId, dto, userId);
  }

  // GET /community/posts/:postId/comments
  @Get('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async getComments(@Param('postId') postId: string, @CurrentUser('_id') userId) {
    return this.commentService.getPostComments(postId, userId);
  }

  // DELETE /community/comments/:commentId — صاحب الكومنت بس
  @Delete('comments/:commentId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async deleteComment(@Param('commentId') commentId: string, @CurrentUser('_id') userId) {
    return this.commentService.deleteComment(commentId, userId);
  }
}