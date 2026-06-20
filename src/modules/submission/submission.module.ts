import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AcademicRecord,AcademicRecordRepository,AcademicRecordSchema, AssessmentRepository, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentRepository, EnrollmentSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema, Submission, SubmissionRepository, SubmissionSchema, User, UserRepository, UserSchema } from '@models/index';
import { JwtService } from '@nestjs/jwt';
import { AcademicRecordService } from '../academicRecord/academicRecord.service';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { EnrollmentService } from '../Enrollment/enrollment.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      {name:Course.name,schema:CourseSchema},
      {name:AcademicRecord.name,schema:AcademicRecordSchema},
      {name:StudyPlan.name,schema:StudyPlanSchema}
    ]),

  ],
  controllers: [SubmissionController],
  providers: [
    SubmissionService,
    SubmissionRepository,
    AssessmentRepository,
    EnrollmentRepository,
    CourseRepository,
    JwtService,
    UserRepository,
    AcademicRecordService,
    AcademicRecordRepository,
    EnrollmentService,
    StudyPlanRepository 
  ],
})
export class SubmissionModule { }