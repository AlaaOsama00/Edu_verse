import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './authDto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}