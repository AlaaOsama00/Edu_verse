import { UserService } from "./user.service";
import { UserRepository } from "@models/user/user.repository";
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "@models/user/user.schema";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "@utils/token";
import { AcademicRecord, AcademicRecordRepository, AcademicRecordSchema, Course, CourseRepository, CourseSchema, Enrollment, EnrollmentSchema, StudyPlan, StudyPlanRepository, StudyPlanSchema } from "@models/index";
import { EnrollmentModule } from "../Enrollment/enrollment.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Enrollment.name, schema: EnrollmentSchema },
            { name: AcademicRecord.name, schema: AcademicRecordSchema },
            { name: Course.name, schema: CourseSchema },
            { name: StudyPlan.name, schema: StudyPlanSchema },
        ]),
        EnrollmentModule,
    ],
    controllers: [UserController],
    providers: [
        UserService,
        UserRepository,
        TokenService,
        JwtService,
        AcademicRecordRepository,
        CourseRepository,
        StudyPlanRepository,
    ],
})
export class UserModule { }