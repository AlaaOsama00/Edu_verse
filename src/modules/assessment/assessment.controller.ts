import { Controller, Post, Get, Body, Param, Patch, UseInterceptors, UploadedFile, BadRequestException, Delete } from '@nestjs/common'
import { AssessmentService } from './assessment.service'
import { Auth } from '@decorators/authDecorator'
import { UserRolesEnum } from '@utils/enum'
import { CreateAssignmentDto } from './dto/create-assignment.dto'
import { CurrentUser } from '@decorators/userDecorator'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) { }

  // إنشاء أسيجمنت
  @Post('upload')
  @Auth(UserRolesEnum.PROFESSOR)
  @UseInterceptors(FileInterceptor('file')) // 'file' ده اسم الحقل اللي الفرانتد هيبعت فيه الملف
  async createTask(
    @CurrentUser('_id') professorId: string,
    @Body() dto: CreateAssignmentDto,
    @UploadedFile() file: Express.Multer.File, // استقبال الملف هنا
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a file for the assignment');
    }

    return this.assessmentService.createAssignment(professorId, dto, file);
  }
  
  @Delete(':assessmentId')
  @Auth(UserRolesEnum.PROFESSOR)
  async deleteAssignment(
    @CurrentUser('_id') professorId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.assessmentService.deleteAssignment(professorId, assessmentId);
  }
  // عرض كل تقييمات المادة (لما يفتح الـ Gradebook)
  @Get('course/:courseId')
  @Auth(UserRolesEnum.STUDENT)
  async getCourseAssessments(@Param('courseId') courseId: string) {
    return this.assessmentService.getCourseAssessments(courseId);
  }

  @Get('announcements')
  @Auth(UserRolesEnum.STUDENT)
  async getAnnouncements(@CurrentUser('_id') studentId: string) {
    return this.assessmentService.getUpcomingAnnouncements(studentId);
  }



}