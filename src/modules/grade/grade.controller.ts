import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { GradeService } from './grade.service';
import { Auth } from '@decorators/authDecorator';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { UserRolesEnum } from '@utils/enum';
import { EditGradeDto } from './dto/edit-grade.dto';


@Controller('grades')
export class GradeController {

    constructor(private readonly gradeService: GradeService) { }

    @Get('gradebook/:courseId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async getGradebook(@Param('courseId') courseId: string) {
        // الواجهة هتبعت: GET /grades/gradebook/6621d9f8a1b2c3d4e5f67890
        return this.gradeService.getGradebook(courseId);
    }

    @Patch(':gradeId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async editGrade(
        @Param('gradeId') gradeId: string,
        @Body() dto: EditGradeDto,
    ) {
        // الواجهة هتبعت: PATCH /grades/6621d9f8a1b2c3d4e5f67890  Body: { "marks": 8 }
        return this.gradeService.editGrade(gradeId, dto);
    }


    @Post('bulk-upload/:courseId/:assessmentId')
    @Auth(UserRolesEnum.PROFESSOR, UserRolesEnum.ADMIN)
    async bulkUpload(
        @Param('courseId') courseId: string,
        @Param('assessmentId') assessmentId: string,
        @Body() dto: BulkGradeDto, // Body عادي مش Form-Data
    ) {
        return this.gradeService.bulkUploadGrades(courseId, assessmentId, dto);
    }
}