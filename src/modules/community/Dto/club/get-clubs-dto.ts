import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ClubTagEnum } from '@utils/enum';

export class SearchOnClubsDto {
  // فلترة بالـ tag — اختياري
  @IsOptional()
  @IsEnum(ClubTagEnum)
  tag?: ClubTagEnum;

  // بحث بالاسم أو الوصف — اختياري
  @IsOptional()
  @IsString()
  search?: string;
}