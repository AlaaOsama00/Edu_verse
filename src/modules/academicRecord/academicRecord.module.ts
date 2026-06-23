import { JwtService } from '@nestjs/jwt';
import { AcademicRecord, AcademicRecordSchema } from '@models/academicRecord/academicRecord.schema';
import { Enrollment, EnrollmentSchema, User, UserSchema, Course, CourseSchema, EnrollmentRepository, UserRepository, CourseRepository, SubmissionRepository, Submission, SubmissionSchema } from '@models/index';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicRecordController } from './academicRecord.controller';
import { AcademicRecordService } from './academicRecord.service';
import { AcademicRecordRepository } from '@models/academicRecord/academicRecord.repository';


@Module({
  imports: [
    // ⚠️ ضروري جداً: حقن كل الـ Schemas اللي الـ Service بيستخدمها
    MongooseModule.forFeature([
      { name: AcademicRecord.name, schema: AcademicRecordSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
       { name: Submission.name, schema: SubmissionSchema },
    ]),
  ],
  controllers: [AcademicRecordController],
  providers: [
    AcademicRecordService,
    AcademicRecordRepository,
    EnrollmentRepository,
    UserRepository,
    CourseRepository,
    JwtService,
    SubmissionRepository
  ],
  exports: [AcademicRecordService, AcademicRecordRepository],
})
export class AcademicRecordModule {}