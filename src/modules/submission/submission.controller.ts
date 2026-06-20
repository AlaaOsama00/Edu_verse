import { Controller, Post, Body, Param, Get, Patch, Query } from '@nestjs/common';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';
import { EditGradeDto } from './dto/edit-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { CurrentUser } from '@decorators/userDecorator';
import { SubmissionService } from './submission.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';


@Controller('Submissions')
export class SubmissionController {

    constructor(private readonly submissionService: SubmissionService) { }

    @Post('submit/:assessmentId')
    @Auth(UserRolesEnum.STUDENT)
    async submitAssignment(
        @CurrentUser('id') userId: string, // هنا بنستخدم الـ Custom Decorator لجلب الـ id مباشرة
        @Param('assessmentId') assessmentId: string,
        @Body() submitDto: SubmitAssignmentDto,
    ) {
        return await this.submissionService.submitAssignment(
            userId,
            assessmentId,
            submitDto.submissionFileUrl,
        );
    }





    // ==========================================
    // 1. عرض الـ Gradebook للدكتور
    // ==========================================
    @Get('gradebook/:courseId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async getGradebook(@Param('courseId') courseId: string) {
        // الواجهة هتبعت: GET /grades/gradebook/6621d9f8a1b2c3d4e5f67890
        return this.submissionService.getGradebook(courseId);
    }

    // ==========================================
    // 2. تعديل درجة طالب واحد
    // ==========================================
    @Patch(':gradeId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async editGrade(
        @Param('gradeId') gradeId: string,
        @CurrentUser('_id') professorId: string,
        @Body() dto: EditGradeDto,
    ) {
        // الواجهة هتبعت: PATCH /grades/6621d9f8a1b2c3d4e5f67890  Body: { "marks": 8 }
        return this.submissionService.editGrade(gradeId, dto, professorId);
    }

    // ==========================================
    // 3. رفع درجات الامتحان من الإكسل (براكتيكال/ميدترم/فاينال)
    // ==========================================
    @Post('bulk-upload/:courseId/:assessmentId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async bulkUpload(
        @Param('professorId') professorId: string,
        @Body() dto: BulkGradeDto, // Body عادي مش Form-Data
    ) {
        return this.submissionService.bulkUploadGrades(professorId, dto);
    }
    // ==========================================
    // 4. واجهة الطالب: درجاتي في الترم الحالي
    // ==========================================

}