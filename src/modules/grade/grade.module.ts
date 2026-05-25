import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseAssessment, CourseAssessmentRepository, CourseAssessmentSchema } from '@models/index';
import { GradingController } from './grade.controller';
import { GradingService } from './grade.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseAssessment.name, schema: CourseAssessmentSchema },
    ]),
  ],
  controllers: [GradingController],
  providers: [GradingService, CourseAssessmentRepository],
})
export class GradeModule {}