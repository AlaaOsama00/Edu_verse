import { SemesterEnum, UserRolesEnum } from '@utils/enum';
import { Controller, Post, Body, Get, Query, Param } from "@nestjs/common";
import { CurrentUser } from "@decorators/userDecorator";
import { Auth } from '@decorators/authDecorator';
import { AddCourseDto, GetAvailableQueryDto, } from './dto';
import { EnrollmentService } from './enrollment.service';

@Controller('Enrollments')
export class EnrollmentController {

  constructor(private readonly enrollmentService: EnrollmentService) { }


  // ==========================================
  // 1. عرض المواد المتاحة 
  // ==========================================
  @Get('available-courses')//for register
  @Auth(UserRolesEnum.STUDENT)
  async getAvailableCourses(
    @CurrentUser('_id') userId: string,
    @Query() query: GetAvailableQueryDto,
  ) {
    const semester = query.semester || SemesterEnum.FALL;
    return this.enrollmentService.getAvailableCourses(userId, semester);
  }


  @Post('confirm')
  @Auth(UserRolesEnum.STUDENT)
  async confirmRegistration(
    @CurrentUser('_id') userId: string,
    @Body() dto: AddCourseDto, // فيه semester بس
  ) {
    return this.enrollmentService.confirmRegistration(userId, dto);
  }

  // ==========================================
  // عرض الجدول
  // ==========================================
  @Get('my-schedule')
  @Auth(UserRolesEnum.STUDENT)
  async getMySchedule(
    @CurrentUser('_id') userId: string,
    @Query('semester') semester: string, // required عشان نوصل الترم
  ) {
    return this.enrollmentService.getMySchedule(userId, semester);
  }

  @Get('student-status/:id')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN)
  async getStudentEnrollmentCourses(
    @Param('id') currentUser: string // الـ ID بتاع الطالب اللي مبعوت في الرابط
  ) {
    const stats = await this.enrollmentService.getStudentEnrollmentCourses(currentUser);
    return {
      success: true,
      data: stats
    };
  }



}