import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller.';
import { JwtService } from '@nestjs/jwt';
import { User, UserRepository, UserSchema } from '@models/index';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule,
     MongooseModule.forFeature([

          { name: User.name,           schema: UserSchema           },
        ]),
      ],
   // محتاجينه بس عشان ConfigService يقرأ CHATBOT_API_URL
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    JwtService,
    UserRepository,
],
})
export class ChatbotModule {}