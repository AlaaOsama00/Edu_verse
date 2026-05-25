import { AuthGuard } from "@guards/auth.guard";
import { Controller, UseGuards, Post, Body,Request } from "@nestjs/common";
import { SemesterEnum } from "@utils/enum";
import { RegisterCoursesDto } from "./dto/registrationCourseDto";
import { RegisterationService } from "./registeration.service";

@Controller('registeration')
@UseGuards(AuthGuard) // معناها مفيش حد يقدر يسجل مواد غير الطالب اللي عامل Login
export class RegistrationController {
  
  constructor(private readonly registrationService: RegisterationService) {}

  // الرابط هيبقى: POST /registration/first
  @Post('first')
  async registerFirstSemester(@Request() req, @Body() dto: RegisterCoursesDto) {
    return this.registrationService.registerMainSemesterCourses(req.user.id, dto, SemesterEnum.First);
  }

  // الرابط هيبقى: POST /registration/second
  @Post('second')
  async registerSecondSemester(@Request() req, @Body() dto: RegisterCoursesDto) {
    return this.registrationService.registerMainSemesterCourses(req.user.id, dto, SemesterEnum.Second);
  }
}