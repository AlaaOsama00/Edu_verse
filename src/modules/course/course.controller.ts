import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRolesEnum } from '@utils/enum';
import { Auth } from '@decorators/authDecorator';
import { Pagination} from '@decorators/pagination.decorator';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/createCourse.dto';
import { UpdateCourseDto } from './dto/updateCourse.dto';
import type{IPagination} from '@decorators/pagination.decorator';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Auth(UserRolesEnum.ADMIN)
  @Post('create')
  CreateCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.createCourse(createCourseDto);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Get()
  GetAllCourses(@Pagination() pagination: IPagination, @Query('search') search?: string) {
    return this.courseService.getAllCourses(pagination, search);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Get(':id')
  findCourseById(@Param('id') id: Types.ObjectId) {
    return this.courseService.findCourseById(id);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Patch(':id')
  UpdateCourse(@Param('id') id: Types.ObjectId, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.updateCourse(id, updateCourseDto);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Delete(':id')
  DeleteCourseById(@Param('id') id: Types.ObjectId) {
    return this.courseService.deleteCourseById(id);
  }

    // 6. جلب كورسات سنة معينة وفصل معين (للطالب في الـ Registration) 
  // @Get('by-year-semester')
  // GetCoursesByYearAndSemester(@Query('year') year: AcademicYearEnum, @Query('semester') semester: SemesterEnum) {
  //   return this.courseService.getCoursesByYearAndSemester(year, semester);
  // }
}
