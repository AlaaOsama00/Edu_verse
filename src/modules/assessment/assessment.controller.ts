import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { AssessmentService } from './assessment.service'
import { Auth } from '@decorators/authDecorator'
import { UserRolesEnum } from '@utils/enum'
import { CreateAssignmentDto } from './dto/create-assignment.dto'
import { CurrentUser } from '@decorators/userDecorator'

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // إنشاء أسيجمنت
  @Post('assignment')
  @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN) // بس الدكتور والأدمن يقدروا يعملوا أسيجمنت
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assessmentService.createAssignment(dto, userId);
  }

  // عرض كل تقييمات المادة (لما يفتح الـ Gradebook)
  @Get('course/:courseId')
  @Auth()
  async getCourseAssessments(@Param('courseId') courseId: string) {
    return this.assessmentService.getCourseAssessments(courseId);
  }
}