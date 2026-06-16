import { SemesterEnum, UserRolesEnum } from '@utils/enum';
import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { CurrentUser } from "@decorators/userDecorator";
import { EnrollmentService } from './enrollment.service';
import { Auth } from '@decorators/authDecorator';
import { AddSingleCourseDto, ConfirmRegistrationDto, GetAvailableQueryDto ,} from './dto';

@Controller('Enrollments')
export class EnrollmentController {
  
  constructor(private readonly enrollmentService: EnrollmentService) {}


   // ==========================================
  // 1. عرض المواد المتاحة 
  // ==========================================
    @Get('available-courses')
    @Auth(UserRolesEnum.STUDENT)
    async getAvailableCourses(
      @CurrentUser('_id') userId: string,
      @Query() query: GetAvailableQueryDto,
    ) {
      const semester = query.semester || SemesterEnum.FALL;
      return this.enrollmentService.getAvailableCourses(userId, semester);
    }

  // ==========================================
  // 2. إضافة مادة واحدة (لما يدوس على زرار Add)
  // ==========================================
  @Post('add-course')
  @Auth(UserRolesEnum.STUDENT)
  async addSingleCourse(
    @CurrentUser('_id') userId: string,
    @Body() dto: AddSingleCourseDto, // فيه courseId و semester
  ) {
    return this.enrollmentService.addSingleCourse(userId, dto);
  }

  // ==========================================
  // 3. تأكيد التسجيل النهائي (آخر خطوة)
  // ==========================================
  @Post('confirm')
  @Auth(UserRolesEnum.STUDENT)
  async confirmRegistration(
    @CurrentUser('_id') userId: string,
    @Body() dto: ConfirmRegistrationDto, // فيه semester بس
  ) {
    return this.enrollmentService.confirmRegistration(userId, dto.semester);
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
}