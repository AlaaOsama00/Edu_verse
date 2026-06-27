import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AcademicRecord, AcademicRecordSchema, AssessmentRepository, ClubMembership, ClubMembershipRepository, ClubMembershipSchema, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentRepository, EnrollmentSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema, Submission, SubmissionRepository, SubmissionSchema, User, UserRepository, UserSchema } from '@models/index';
import { JwtService } from '@nestjs/jwt';
import { AcademicRecordModule } from '../academicRecord/academicRecord.module';
import { EnrollmentModule } from '../Enrollment/enrollment.module';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: ClubMembership.name, schema: ClubMembershipSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: AcademicRecord.name, schema: AcademicRecordSchema },
      { name: StudyPlan.name, schema: StudyPlanSchema },
    ]),
    AcademicRecordModule,
    EnrollmentModule,
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
    StudyPlanRepository,
    ClubMembershipRepository,
  ],
})
export class SubmissionModule { }