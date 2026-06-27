import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourseSchema,
  CourseRepository,
  StudyPlanSchema,
  EnrollmentSchema,
  Enrollment,
  StudyPlan,
  Course,
  StudyPlanRepository,
  EnrollmentRepository,
  UserRepository,
  UserSchema,
  User,
  AcademicRecord,
  AcademicRecordSchema,
  AcademicRecordRepository,
  Assessment,
  AssessmentSchema,
  AssessmentRepository,
  Submission,
  SubmissionSchema,
  SubmissionRepository,
} from '@models/index';
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
      { name: AcademicRecord.name, schema: AcademicRecordSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
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
    AssessmentRepository,
    SubmissionRepository,
  ],
})
export class EnrollmentModule {}