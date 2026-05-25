import { Controller, Post, Body } from '@nestjs/common';
import { GradeCourseDto } from './dto/gradeDto';
import { GradingService } from './grade.service';

@Controller('grades')
export class GradingController {
  
  constructor(private readonly gradeService: GradingService) {}

  @Post()
  async gradeCourse(@Body() gradeDto: GradeCourseDto) {
    return this.gradeService.gradeStudentCourse(gradeDto);
  }
}