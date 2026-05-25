import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@guards/auth.guard';
import { RolesGuard } from '@guards/roles.guard';
import { UserRolesEnum } from '@utils/enum';
import { Roles } from '@decorators/roleDecorator';

export function Auth(...roles: UserRolesEnum[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(AuthGuard, RolesGuard), 
  );
}