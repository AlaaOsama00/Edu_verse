import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRolesEnum } from '@utils/enum';
import { Auth } from '@decorators/authDecorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/updateUserDto';
import { CurrentUser } from '@decorators/userDecorator';

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
    //____________________________


    // 1. بيانات الطالب والسنة الحالية
    @Auth()
    @Get(['profile', 'profile/:id'])
    async getMyProfile(@CurrentUser() currentUser: any, @Param('id') targetUserId?: string) {
        const idToFetch = targetUserId || currentUser;
       
        return this.userService.getUserProfile(currentUser, idToFetch);
    }

    @Get('search-students')
    async searchStudents(@Query('q') query: string) {
        // هنا الدالة هتبحث في الاسم، الإيميل، والـ studentId عشان بعتنا الـ Role
        const results = await this.userService.searchUsers(query, UserRolesEnum.STUDENT);
        return { success: true, count: results.length, data: results };
    }

    @Get('search-professors')
    async searchProfessors(@Query('q') query: string) {
        // هنا الدالة هتبحث في الاسم والإيميل بس
        const results = await this.userService.searchUsers(query, UserRolesEnum.PROFESSOR);
        return { success: true, count: results.length, data: results };
    }


}