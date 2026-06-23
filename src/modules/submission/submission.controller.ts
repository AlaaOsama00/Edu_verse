import { Controller, Post, Body, Param, Get, Patch} from '@nestjs/common';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';
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




}