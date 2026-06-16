import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Grade, GradeSchema } from '@models/grade/grade.schema';
import { GradeService } from './grade.service';
import { GradeRepository } from '@models/grade/grade.repository';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AcademicRecord,AcademicRecordRepository,AcademicRecordSchema, AssessmentRepository, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentRepository, EnrollmentSchema, User, UserRepository, UserSchema } from '@models/index';
import { JwtService } from '@nestjs/jwt';
import { GradeController } from './grade.controller';
import { AcademicRecordService } from '../academicRecord/academicRecord.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      {name:Course.name,schema:CourseSchema},
      {name:AcademicRecord.name,schema:AcademicRecordSchema}
    ]),

  ],
  controllers: [GradeController],
  providers: [
    GradeService,
    GradeRepository,
    AssessmentRepository,
    EnrollmentRepository,
    CourseRepository,
    JwtService,
    UserRepository,
    AcademicRecordService,
    AcademicRecordRepository
  ],
})
export class GradeModule { }