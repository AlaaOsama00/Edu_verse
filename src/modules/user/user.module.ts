import { UserService } from "./user.service";
import { UserRepository } from "@models/user/user.repository";
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "@models/user/user.schema";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "@utils/token";

@Module({
    imports: [
         // Load .env file and make it available globally
        MongooseModule.forFeature([{
             name: User.name, schema: UserSchema
        },
         
    ])],

    controllers: [UserController],
    providers: [UserService,UserRepository,TokenService,JwtService],


})

export class UserModule {}