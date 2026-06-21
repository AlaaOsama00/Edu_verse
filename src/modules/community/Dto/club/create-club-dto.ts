import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ArrayMinSize,
  
} from 'class-validator';
import { ClubTagEnum } from '@utils/enum';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ClubTagEnum, { each: true })
  @IsNotEmpty()
  tags: ClubTagEnum[];

}