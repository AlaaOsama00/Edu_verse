import { Module } from '@nestjs/common';
import { Course, CourseRepository, CourseSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema, User, UserRepository, UserSchema } from '@models/index';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CacheModule } from '@nestjs/cache-manager';


@Module({
     imports: [
          MongooseModule.forFeature([{
               name: Course.name, schema: CourseSchema
          }, {
               name: User.name, schema: UserSchema
          },
          { name: StudyPlan.name, schema: StudyPlanSchema }
          ]),
          CacheModule.register(),
     ],
     controllers: [CourseController],
     providers: [
          CourseService,
          CourseRepository,
          JwtService,
          UserRepository,
          StudyPlanRepository
     ],

})
export class CourseModule { }
