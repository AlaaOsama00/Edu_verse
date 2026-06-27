import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRolesEnum } from '@utils/enum';
import { Auth } from '@decorators/authDecorator';
import { Pagination} from '@decorators/pagination.decorator';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/createCourse.dto';

import type{IPagination} from '@decorators/pagination.decorator';
import { CurrentUser } from '@decorators/userDecorator';


@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache
  ) {}

@Get('clear-cache')
  async clearCache() {
  const cache: any = this.cacheManager;
  
  try {
    if (typeof cache.reset === 'function') {
      await cache.reset();
    } else if (typeof cache.clear === 'function') {
      await cache.clear();
    } else if (cache.stores) {
      // لو الكاش متقسم لأكتر من Store
      for (const store of cache.stores) {
        if (store.reset) await store.reset();
        if (store.clear) await store.clear();
      }
    }
    return 'Cache cleared on Railway successfully!';
  } catch (error) {
    return 'Error clearing cache: ' + error.message;
  }
  }
  @Auth(UserRolesEnum.ADMIN)
  @Post('create')
  CreateCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.createCourse(createCourseDto);
  }

  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT)
  @Get()
  GetAllCourses(@CurrentUser('role') userRole: string,@Pagination() pagination: IPagination, @Query('search') search?: string) {
    return this.courseService.getAllCourses(userRole,pagination, search);
  }

  @Auth(UserRolesEnum.ADMIN, UserRolesEnum.STUDENT, UserRolesEnum.PROFESSOR) 
  @Get(':id')
  findCourseById(@Param('id') id: Types.ObjectId) {
    return this.courseService.findCourseById(id);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Patch(':id')
  UpdateCourse(@Param('id') id: Types.ObjectId, @Body() updateCourseDto: any) {
    return this.courseService.updateCourse(id, updateCourseDto);
  }

  @Auth(UserRolesEnum.ADMIN)
  @Delete(':id')
  DeleteCourseById(@Param('id') id: Types.ObjectId) {
    return this.courseService.deleteCourseById(id);
  }

   
  
}
