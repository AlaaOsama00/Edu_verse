import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { AcademicRecordService } from './academicRecord.service';
import { UserRolesEnum, SemesterEnum } from '@utils/enum';
import { CurrentUser } from '@decorators/userDecorator';
import { Auth } from '@decorators/authDecorator';

@Controller('academic-records')
export class AcademicRecordController {
  constructor(private readonly academicRecordService: AcademicRecordService) { }

  @Get('my-courses')
  @Auth(UserRolesEnum.STUDENT)
  async getMyCourses(
    @CurrentUser('_id') studentId: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: SemesterEnum,
  ) {
    return this.academicRecordService.getAllCourses(studentId, academicYear, semester);
  }

  @Get('courses/:studentId')
  @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
  async getStudentCourses(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: SemesterEnum,
  ) {
    return this.academicRecordService.getAllCourses(studentId, academicYear, semester);
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
  @Auth(UserRolesEnum.PROFESSOR) // فقط الأدمن يقدر يعمل تقييم لكل الطلاب دفعة واحدة
  async evaluateAllStudentsStatus() {
    return this.academicRecordService.evaluateAllStudents();
  }
}
