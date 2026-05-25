import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() 
export class AppController {
  constructor(private readonly appService: AppService) {}
  
  @Get() //act as api [method=>GET, url=>'/']
  getHello(): string {
   //return 'hi from nestjs';
   return this.appService.getHello();
  }
}
