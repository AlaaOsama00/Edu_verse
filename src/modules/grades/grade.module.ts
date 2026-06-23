import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { AcademicRecordModule } from '../academicRecord/academicRecord.module';
import {
  Enrollment,
  EnrollmentSchema,
  User,
  UserSchema,
  EnrollmentRepository,
  UserRepository,
  Course,
  CourseSchema,
  CourseRepository,
  StudyPlan,
  StudyPlanSchema,
  StudyPlanRepository,
} from '@models/index';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: StudyPlan.name, schema: StudyPlanSchema },
    ]),
    AcademicRecordModule,
  ],
  controllers: [GradeController],
  providers: [
    GradeService,
    EnrollmentRepository,
    UserRepository,
    CourseRepository,
    StudyPlanRepository,
    JwtService,
  ],
})
export class GradeModule {}
