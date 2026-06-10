import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import  cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true ,
    forbidNonWhitelisted: true,
  }),
 
);
//app.useGlobalFilters(new AllExceptionsFilter());


  app.use(cors({
   origin:true, 
    credentials: true, // allow cookies to be sent with requests
  }))
 const port = Number(process.env.PORT || 3001);
 await app.listen(port, '0.0.0.0');}

 void bootstrap();