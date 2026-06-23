import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ActivationEnum, UserRolesEnum } from '@utils/enum';
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
    //____________________________


    @Get('profile/:id')
    @Auth(UserRolesEnum.STUDENT, UserRolesEnum.ADMIN, UserRolesEnum.PROFESSOR) // ضيفي الباقي
    async getStudentProfile(
        @Param('id') targetUserId: string,
    ) {

        return this.userService.getStudentProfile( targetUserId);
    }

    @Get('search-students')
    @Auth(UserRolesEnum.ADMIN)
    async searchStudents(
        @Query('q') query?: string,
        @Query('status') status?: ActivationEnum | 'ALL'
    ) {
        const results = await this.userService.searchUsers(query, UserRolesEnum.STUDENT, status);
        return {
            success: true,
            count: results.length,
            data: results
        };
    }

    @Get('search-professors')
    @Auth(UserRolesEnum.ADMIN,UserRolesEnum.PROFESSOR,UserRolesEnum.STUDENT)
    async searchProfessors(@Query('q') query: string, @Query('status') status?: ActivationEnum | 'ALL') {
        // هنا الدالة هتبحث في الاسم والإيميل بس
        const results = await this.userService.searchUsers(query, UserRolesEnum.PROFESSOR, status);
        return { success: true, count: results.length, data: results };
    }


}