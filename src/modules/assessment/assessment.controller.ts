import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common'
import { AssessmentService } from './assessment.service'
import { Auth } from '@decorators/authDecorator'
import { UserRolesEnum } from '@utils/enum'
import { CreateAssignmentDto } from './dto/create-assignment.dto'
import { CurrentUser } from '@decorators/userDecorator'
import { BulkGradeDto } from '../grade/dto/bulk-grade.dto'
import { EditGradeDto } from '../grade/dto/edit-grade.dto'

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // إنشاء أسيجمنت
  @Post('add-assignment')
  @Auth(UserRolesEnum.PROFESSOR)  
  async createAssignment(
       @CurrentUser('_id') userId: string,
        @Body() dto: CreateAssignmentDto,
  ) {
    return this.assessmentService.createAssignment(userId, dto);
  }

  // عرض كل تقييمات المادة (لما يفتح الـ Gradebook)
  @Get('course/:courseId')
  @Auth()
  async getCourseAssessments(@Param('courseId') courseId: string) {
    return this.assessmentService.getCourseAssessments(courseId);
  }

  @Get('announcements')
  @Auth(UserRolesEnum.STUDENT)
  async getAnnouncements(@CurrentUser('_id') studentId: string) {
    return this.assessmentService.getUpcomingAnnouncements(studentId);
  }


  
}