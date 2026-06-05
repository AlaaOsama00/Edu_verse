import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema, CourseRepository, StudyPlanSchema, EnrollmentSchema, Enrollment, StudyPlan, Course, StudyPlanRepository, EnrollmentRepository, UserRepository, UserSchema, User, } from '@models/index';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { JwtService } from '@nestjs/jwt';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: StudyPlan.name, schema: StudyPlanSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  controllers: [EnrollmentController],
  providers: [
    EnrollmentService,
    EnrollmentRepository,
    StudyPlanRepository,
    CourseRepository,
    JwtService,
    UserRepository
  ],
})
export class EnrollmentModule {}