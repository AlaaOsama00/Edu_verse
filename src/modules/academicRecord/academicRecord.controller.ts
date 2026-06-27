import { Controller, Get, Post, Param, Query, ForbiddenException } from '@nestjs/common';
import { AcademicRecordService } from './academicRecord.service';
import { UserRolesEnum, SemesterEnum } from '@utils/enum';
import { CurrentUser } from '@decorators/userDecorator';
import { Auth } from '@decorators/authDecorator';

@Controller('academic-records')
export class AcademicRecordController {
  constructor(private readonly academicRecordService: AcademicRecordService) { }

  // @Get('my-courses')
  // @Auth(UserRolesEnum.STUDENT)
  // async getMyCourses(
  //   @CurrentUser('_id') studentId: string,
  //   @Query('academicYear') academicYear?: string,
  //   @Query('semester') semester?: SemesterEnum,
  // ) {
  //   return this.academicRecordService.getAllAcademicSummary(studentId, academicYear, semester);
  // }

  @Get('courses/:studentId')
  @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  async getStudentCourses(
    @Param('studentId') studentId: string,
    @CurrentUser('_id') currentUserId: string,
    @CurrentUser('role') role: UserRolesEnum,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: SemesterEnum,
  ) {
    if (role == UserRolesEnum.STUDENT && currentUserId.toString() != studentId.toString()) {
      throw new ForbiddenException('You are not allowed to view other students\' academic records');
    }
    return this.academicRecordService.getAllAcademicSummary(studentId, academicYear, semester);
  }



  @Get('gpa-history/:studentId')
  @Auth(UserRolesEnum.STUDENT)
  async getStudentGpaHistory(@Param('studentId') studentId: string) {
    return this.academicRecordService.getGpaHistory(studentId);
  }

  @Get('dashboard')
  @Auth(UserRolesEnum.STUDENT)
  async getStudentDashboard(@CurrentUser('_id') studentId: string) {
    return this.academicRecordService.getStudentDashboard(studentId);
  }

  @Post('evaluate/:studentId')
  @Auth(UserRolesEnum.ADMIN) // الدكتور أو الأدمن يقدر يعمل تقييم
  async evaluateStudentStatus(
    @Param('studentId') studentId: string,
    @Query('semester') semester?: SemesterEnum,
  ) {
    return this.academicRecordService.evaluateStudentStatus(studentId, semester);
  }

  @Post('evaluate-all')
  @Auth(UserRolesEnum.ADMIN) // فقط الأدمن يقدر يعمل تقييم لكل الطلاب دفعة واحدة
  async evaluateAllStudentsStatus() {
    return this.academicRecordService.evaluateAllStudents();
  }
}
