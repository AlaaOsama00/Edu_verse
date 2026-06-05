import { SemesterEnum } from '@utils/enum';
import { IsIn, IsNotEmpty } from 'class-validator';

export class ConfirmRegistrationDto {
  @IsIn([SemesterEnum.FALL, SemesterEnum.SPRING], { message: 'Only Fall/Spring are allowed here.' })
  @IsNotEmpty()
  semester: SemesterEnum;
}