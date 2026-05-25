import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentSchema, CourseSchema, StudentRepository, CourseRepository, CourseAssessmentRepository,CourseAssessmentSchema } from '@models/index';
import { RegistrationController } from './registeration.controller';
import { RegisterationService } from './registeration.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Student', schema: StudentSchema },
      { name: 'Course', schema: CourseSchema },
      { name: 'CourseAssessment', schema: CourseAssessmentSchema },
    ]),
  ],
  controllers: [RegistrationController],
  providers: [
    RegisterationService,
    StudentRepository,
    CourseRepository,
    CourseAssessmentRepository,
  ],
})
export class RegistrationModule {}