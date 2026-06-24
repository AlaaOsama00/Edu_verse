import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema, CourseRepository, StudyPlanSchema, EnrollmentSchema, Enrollment, StudyPlan, Course, StudyPlanRepository, EnrollmentRepository, UserRepository, UserSchema, User, AcademicRecord, AcademicRecordSchema, AcademicRecordRepository } from '@models/index';
import { EnrollmentController } from './enrollment.controller';
import { JwtService } from '@nestjs/jwt';
import { EnrollmentService } from './enrollment.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: StudyPlan.name, schema: StudyPlanSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
      { name: AcademicRecord.name, schema: AcademicRecordSchema }
    ]),
  ],
  controllers: [EnrollmentController],
  providers: [
    EnrollmentService,
    EnrollmentRepository,
    StudyPlanRepository,
    CourseRepository,
    JwtService,
    UserRepository,
    AcademicRecordRepository,
  ],
})
export class EnrollmentModule {}