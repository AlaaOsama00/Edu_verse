import { TokenService } from '@services/token.service';
import { UserRepository } from '@models/user/user.repository';
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StudentRepository } from '@models/student/student.repository';
import { User, UserSchema } from '@models/user/user.schema';
import { JwtService } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { Student, StudentSchema, Course, CourseSchema, CourseAssessment, CourseAssessmentSchema, CourseRepository, CourseAssessmentRepository } from '@models/index';
import { StudentService } from '../student/student.service';



@Module({
    imports: [
         // Load .env file and make it available globally
        MongooseModule.forFeature([{
             name: User.name, schema: UserSchema
        },{
             name: Student.name, schema: StudentSchema
        },{
             name: Course.name, schema: CourseSchema
        },{
             name: CourseAssessment.name, schema: CourseAssessmentSchema
        }])      
    ],
    controllers: [AuthController],
    providers: [StudentRepository,CourseRepository,AuthService,CourseAssessmentRepository,UserRepository,TokenService,JwtService,StudentService]
})

export class AuthModule {}