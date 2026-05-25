import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import devConfig from './config/dev.config';
import { AuthModule } from './modules/auth/auth.module';
import { CourseModule } from './modules/course/course.module';
import { GradeModule } from './modules/grade/grade.module';
import { StudentModule } from './modules/student/student.module';



@Module({
   imports: [
    ConfigModule.forRoot({//for loading environment variables
          load: [devConfig],
          isGlobal:true
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('DATABASE_URL'),
      }),
    }),

  AuthModule,

  GradeModule,

  CourseModule,

  StudentModule
 
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
