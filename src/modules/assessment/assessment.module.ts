import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentController } from './assessment.controller';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AssessmentRepository, Enrollment, EnrollmentRepository, EnrollmentSchema, Grade, GradeRepository, GradeSchema, User, UserRepository, UserSchema } from '@models/index';
import { AssessmentService } from './assessment.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [
    // سجل الـ Schema في المونجووز
    MongooseModule.forFeature([
      { name: Assessment.name, schema: AssessmentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema }, // <-- Added
      { name: Grade.name, schema: GradeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule, // <--- وأضفها هنا
  ],
  controllers: [AssessmentController],
  providers: [
    AssessmentService,
    AssessmentRepository,
    EnrollmentRepository,
    GradeRepository,
    UserRepository, // <--- ضيفه هنا
  ],
  exports: [AssessmentService], // لو موديل تاني عاوز يستخدمه
})
export class AssessmentModule { }