import { Controller, Get, Param, Query } from '@nestjs/common';
import { GradeService } from './grade.service';
import { CurrentUser } from '@decorators/userDecorator';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';

@Controller('grades')
export class GradeController {
    constructor(private readonly gradeService: GradeService) { }

    // ==========================================
    // 1. واجهة الطالب: جلب درجاتي وGPA التراكمي والمجمع حسب السنة والترم
    // ==========================================
    @Get('my-grades')
    @Auth(UserRolesEnum.STUDENT)
    async geGrades(@CurrentUser('_id') studentId: string) {
        return this.gradeService.getStudentGrades(studentId);
    }

    // ==========================================
    // 2. واجهة الأدمن أو الدكتور: جلب درجات طالب معين
    // ==========================================
    @Get('student/:studentId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async getStudentGrades(@Param('studentId') studentId: string) {
        return this.gradeService.getStudentGrades(studentId);
    }

    // ==========================================
    // 3. واجهة الدكتور أو الأدمن: عرض الـ Gradebook للدكتور
    // ==========================================
    @Get('gradebook/:professorId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async getGradebook(@Param('professorId') professorId: string) {
        return this.gradeService.getGradebook(professorId);
    }


    @Get('my-current-grades')
    @Auth(UserRolesEnum.STUDENT)
    async getMyCurrentGrades(
        @CurrentUser('_id') studentId: string,
        @Query('semester') semester: string,
    ) {
        return this.gradeService.getMyCurrentGrades(studentId, semester);
    }
}
