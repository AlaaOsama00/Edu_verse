import { IsEnum, IsOptional } from 'class-validator';
import { SemesterEnum } from '@utils/enum';

export class GetAvailableQueryDto {
  @IsEnum(SemesterEnum)
  @IsOptional()
  semester?: SemesterEnum;
}