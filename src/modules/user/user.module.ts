import { UserService } from "./user.service";
import { UserRepository } from "@models/user/user.repository";
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "@models/user/user.schema";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "@utils/token";
import { AcademicRecord, AcademicRecordRepository, AcademicRecordSchema, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentRepository, EnrollmentSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema } from "@models/index";
import { EnrollmentService } from "../Enrollment/enrollment.service";

@Module({
    imports: [
        // Load .env file and make it available globally
        MongooseModule.forFeature([{
            name: User.name, schema: UserSchema,
        },
        { name: Enrollment.name, schema: EnrollmentSchema },
        { name: AcademicRecord.name, schema: AcademicRecordSchema },
        { name: Course.name, schema: CourseSchema },
        { name: StudyPlan.name, schema: StudyPlanSchema },
        ])],

    controllers: [UserController],
    providers: [
        UserService,
        UserRepository,
        TokenService,
        JwtService, EnrollmentService
        , AcademicRecordRepository,
        CourseRepository, StudyPlanRepository
        , EnrollmentRepository],


})

export class UserModule { }