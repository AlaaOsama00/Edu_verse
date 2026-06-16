/*import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';

import { ClubService } from './services/club.service';
import { CurrentUser } from '@decorators/userDecorator';
import { CreateClubDto } from './Dto/club/create-club-dto';
import { SearchOnClubsDto } from './Dto/club/get-clubs-dto';

@Controller('community')
export class CommunityController {
  constructor(
    private readonly clubService: ClubService,
    private readonly membershipService: ClubMembershipService,
    private readonly resourceService: ClubResourceService,
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) {}

  // ==========================================
  // CLUBS
  // ==========================================
  // POST /community/clubs — Admin 
 
  @Post('club')
  @Auth(UserRolesEnum.ADMIN)
  async createClub(@Body() dto: CreateClubDto,  @CurrentUser('_id') adminId) {
    return this.clubService.createClub(dto, adminId);
  }

  // GET /community/clubs?tag=...&level=...&search=...
  // أي يوزر logged in يقدر يشوف الـ explore page
  @Get('clubs')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async getClubs(@Query() query: SearchOnClubsDto, @CurrentUser('_id') userId) {
    return this.clubService.searchOnClubs(query,userId );
  }

  // GET /community/clubs/:clubId
  @Get('clubs/:clubId')
  @Auth(UserRolesEnum.STUDENT)
  async getClub(@Param('clubId') clubId: string) {
    return this.clubService.getClubById(clubId);
  }

  // ==========================================
  // MEMBERSHIP — Join / Leave
  // ==========================================

  // POST /community/clubs/:clubId/join
  @Post('clubs/:clubId/join')
  @Auth(UserRolesEnum.STUDENT)
  async joinClub(@Param('clubId') clubId: string, @Req() req) {
    return this.membershipService.joinClub(clubId, req.user._id);
  }

  // Delete /community/clubs/:clubId/leave
  @Delete('clubs/:clubId/leave')
  @Auth(UserRolesEnum.STUDENT)
  async leaveClub(@Param('clubId') clubId: string, @Req() req) {
    return this.membershipService.leaveClub(clubId, req.user._id);
  }

  // GET /community/clubs/:clubId/members — Admin يشوف الـ members
  @Get('clubs/:clubId/members')
  @Auth(UserRolesEnum.PROFESSOR)
  async getMembers(@Param('clubId') clubId: string) {
    return this.membershipService.getClubMembers(clubId);
  }

  // ==========================================
  // RESOURCES — Admin يضيف، الكل يشوف
  // ==========================================

  // GET /community/clubs/:clubId/resources
  @Get('clubs/:clubId/resources')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async getResources(@Param('clubId') clubId: string) {
    return this.resourceService.getClubResources(clubId);
  }

  // POST /community/clubs/:clubId/resources — Admin بس
  @Post('clubs/:clubId/resources')
  @Auth(UserRolesEnum.PROFESSOR)
  async addResource(
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubResourceDto,
    @Req() req,
  ) {
    return this.resourceService.addResource(clubId, dto, req.user._id);
  }

  // DELETE /community/resources/:resourceId — Admin بس
  @Delete('resources/:resourceId')
  @Auth(UserRolesEnum.PROFESSOR)
  async deleteResource(@Param('resourceId') resourceId: string, @Req() req) {
    return this.resourceService.deleteResource(resourceId, req.user._id);
  }

  // ==========================================
  // POSTS — Members بس
  // ==========================================

  // GET /community/clubs/:clubId/posts — Feed بتاع الـ club
  @Get('clubs/:clubId/posts')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async getClubFeed(@Param('clubId') clubId: string, @Req() req) {
    return this.postService.getClubFeed(clubId, req.user._id);
  }

  // POST /community/clubs/:clubId/posts
  @Post('clubs/:clubId/posts')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async createPost(
    @Param('clubId') clubId: string,
    @Body() dto: CreatePostDto,
    @Req() req,
  ) {
    return this.postService.createPost(clubId, dto, req.user._id);
  }

  // DELETE /community/posts/:postId — صاحب البوست بس
  @Delete('posts/:postId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async deletePost(@Param('postId') postId: string, @Req() req) {
    return this.postService.deletePost(postId, req.user._id);
  }

  // POST /community/posts/:postId/like — Toggle Like
  @Post('posts/:postId/like')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async toggleLike(@Param('postId') postId: string, @Req() req) {
    return this.postService.toggleLike(postId, req.user._id);
  }

  // ==========================================
  // COMMENTS — Members بس
  // ==========================================

  // GET /community/posts/:postId/comments
  @Get('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async getComments(@Param('postId') postId: string, @Req() req) {
    return this.commentService.getPostComments(postId, req.user._id);
  }

  // POST /community/posts/:postId/comments
  @Post('posts/:postId/comments')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req,
  ) {
    return this.commentService.addComment(postId, dto, req.user._id);
  }

  // DELETE /community/comments/:commentId — صاحب الكومنت بس
  @Delete('comments/:commentId')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR)
  async deleteComment(@Param('commentId') commentId: string, @Req() req) {
    return this.commentService.deleteComment(commentId, req.user._id);
  }
}*/