import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentController } from './assessment.controller';
import { Assessment, AssessmentSchema } from '@models/assessment/assessment.schema';
import { AssessmentRepository, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentRepository, EnrollmentSchema, Grade, GradeRepository, GradeSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema, User, UserRepository, UserSchema } from '@models/index';
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
      { name: StudyPlan.name, schema: StudyPlanSchema },
      { name: Course.name, schema: CourseSchema }
    ]),
    AuthModule, // <--- وأضفها هنا
  ],
  controllers: [AssessmentController],
  providers: [
    AssessmentService,
    AssessmentRepository,
    EnrollmentRepository,
    GradeRepository,
    StudyPlanRepository,
    UserRepository, // <--- ضيفه هنا
      CourseRepository,
  ],
  exports: [AssessmentService], // لو موديل تاني عاوز يستخدمه
})
export class AssessmentModule { }