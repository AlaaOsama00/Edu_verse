import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRolesEnum } from '@utils/enum';
import { Auth } from '@decorators/authDecorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/updateUserDto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }
    @Post('create-account')
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
    }

    @Auth(UserRolesEnum.ADMIN)
    @Patch(':id')
    updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.updateUserData(id, updateUserDto);
    }

    @Auth(UserRolesEnum.ADMIN)
    @Delete(':id')
    deleteUserById(@Param('id') id: string) {
        return this.userService.deleteUserById(id);
    }
    // مثلاً: GET /users?role=PROFESSOR
    @Auth(UserRolesEnum.ADMIN) // طبعاً بس الأدمن يقدر يشوف كل الناس
    @Get()
    async getAllUsers(@Query('role') role: UserRolesEnum) {
        return this.userService.getAllUsersByRole(role);
    }
}