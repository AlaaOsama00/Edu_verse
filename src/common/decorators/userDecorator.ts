import { createParamDecorator, ExecutionContext } from '@nestjs/common';


export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {//data Optional value passed into decorator. Example: @User('id')//ctx Contains request context
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
  
    return data ? user?.[data] : user;//if data is provided it will return the user's property with that name, otherwise it will return the whole user object
  },
);

/**
 In a controller, you can use the @CurrentUser() decorator to access the currently authenticated user's information. For example: 

 @Get('profile')
 getProfile(@CurrentUser() user: User) {
   return user;
 }
 In this example, the getProfile method will return the currently authenticated user's information when the 'profile' endpoint is accessed. 
 */