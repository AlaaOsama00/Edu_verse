import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  await app.listen(port);
}
 bootstrap();