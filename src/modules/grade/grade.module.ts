import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Grade, GradeSchema } from '@models/grade/grade.schema';
import { GradeService } from './grade.service';
import { GradeRepository } from '@models/grade/grade.repository';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AssessmentRepository, Enrollment, EnrollmentRepository, EnrollmentSchema, User, UserRepository, UserSchema } from '@models/index';
import { JwtService } from '@nestjs/jwt';
import { GradeController } from './grade.controller';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema }
    ]),

  ],
  controllers: [GradeController],
  providers: [
    GradeService,
    GradeRepository,
    AssessmentRepository,
    EnrollmentRepository,
    JwtService,
    UserRepository
  ],
})
export class GradeModule { }