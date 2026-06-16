import { Controller, Post, Body, Param, Get, Patch, Query } from '@nestjs/common';
import { GradeService } from './grade.service';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';
import { EditGradeDto } from './dto/edit-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { CurrentUser } from '@decorators/userDecorator';


@Controller('grades')
export class GradeController {

    constructor(private readonly gradeService: GradeService) { }
    // ==========================================
    // 1. عرض الـ Gradebook للدكتور
    // ==========================================
    @Get('gradebook/:courseId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async getGradebook(@Param('courseId') courseId: string) {
        // الواجهة هتبعت: GET /grades/gradebook/6621d9f8a1b2c3d4e5f67890
        return this.gradeService.getGradebook(courseId);
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
        return this.gradeService.editGrade(gradeId, dto, professorId);
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
        return this.gradeService.bulkUploadGrades(professorId, dto);
    }
    // ==========================================
    // 4. واجهة الطالب: درجاتي في الترم الحالي
    // ==========================================
    @Get('my-grades')
    @Auth(UserRolesEnum.STUDENT) // مهم: بس الطلاب يقدروا يوصلوا هنا
    async getMyGrades(
        @CurrentUser('_id') studentId: string,
        @Query('academicYear') academicYear: string,
        @Query('semester') semester: string,
    ) {
        return this.gradeService.getMyCurrentGrades(studentId, academicYear, semester);
    }
}