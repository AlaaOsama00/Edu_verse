import { Module } from '@nestjs/common';
import {  Course, CourseAssessment, CourseAssessmentRepository, CourseAssessmentSchema, CourseRepository, CourseSchema, Student, StudentRepository, StudentSchema,User,UserRepository, UserSchema } from '@models/index';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';

@Module({
  imports: [
     MongooseModule.forFeature([{
      name: Student.name, schema: StudentSchema
      },{
      name: Course.name, schema: CourseSchema
      },{
      name: User.name, schema: UserSchema
      },{
      name: CourseAssessment.name, schema: CourseAssessmentSchema
      }
     ]),
  ],
  controllers: [StudentController],
  providers: [StudentRepository, StudentService,CourseRepository,CourseAssessmentRepository,UserRepository,JwtService],
})
export class StudentModule {}
