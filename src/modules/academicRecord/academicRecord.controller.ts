import { Controller, Get } from '@nestjs/common';
import { AcademicRecordService } from './academicRecord.service';
import { UserRolesEnum } from '@utils/enum';
import { CurrentUser } from '@decorators/userDecorator';
import { Auth } from '@decorators/authDecorator';

@Controller('academic-records')
export class AcademicRecordController {
  constructor(private readonly academicRecordService: AcademicRecordService) { }


  @Get('transcript')
  @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN) // الطالب يشوف سجلوه، والأدمن كمان
  async getTranscript(@CurrentUser('_id') studentId: string) {
    return this.academicRecordService.getFullTranscript(studentId);
  }

  @Get('dashboard')
  @Auth(UserRolesEnum.STUDENT)
  async getStudentDashboard(@CurrentUser('_id') studentId: string) {
    return this.academicRecordService.getStudentDashboard(studentId);
  }
}