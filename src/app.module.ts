import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import devConfig from './config/dev.config';
import { AuthModule } from './modules/auth/auth.module';
import { CourseModule } from './modules/course/course.module';
import { GradeModule } from './modules/grade/grade.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { EnrollmentModule } from './modules/Enrollment/enrollment.module';
import { UserModule } from './modules/user/user.module';
import { AcademicRecordModule } from './modules/academicRecord/academicRecord.module';
import { CloudinaryModule } from './common/multer/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({//for loading environment variables
      load: [devConfig],
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL') || process.env.DB_URL
      }),
    }),
    AuthModule,
    UserModule,
    GradeModule,
    AcademicRecordModule,
    CourseModule,
    AssessmentModule,
    GradeModule,
    AcademicRecordModule,
    EnrollmentModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  
})
export class AppModule { }
