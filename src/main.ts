import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import  cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true ,
    forbidNonWhitelisted: true,
  }),
 
);
//app.useGlobalFilters(new AllExceptionsFilter());

 const configService = app.get(ConfigService)
 const port = configService.get<number>('PORT') || 3000;

  app.use(cors({
   origin:true, 
    credentials: true, // allow cookies to be sent with requests
  }))

  await app.listen(port);
}
 void bootstrap();