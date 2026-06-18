import { AcademicYearEnum, SemesterEnum } from '@utils/enum';
import { IsString, IsNumber, IsEnum, IsNotEmpty, IsBoolean, IsOptional, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';



@ValidatorConstraint({ name: 'isDynamicMin', async: false })
export class MinCreditHoursConstraint implements ValidatorConstraintInterface {
  validate(creditHours: number, args: ValidationArguments) {
    const dto = args.object as CreateCourseDto;

    // إذا كان isTraining يساوي true، فإن الحد الأدنى هو 0
    if (dto.isTraining === true||dto.semester==SemesterEnum.SUMMER) {
      return creditHours == 0;
    }

    return creditHours > 0;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as CreateCourseDto;
    const minRequired = dto.isTraining === true||dto.semester==SemesterEnum.SUMMER ? 0 : 1;
    return `creditHours must not be less than ${minRequired}`;
  }
}

export class CreateCourseDto {

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  description: string

  @IsNumber()
  @Validate(MinCreditHoursConstraint) // تم استبدال @Min هنا
  creditHours: number;

  @IsNotEmpty()
  @IsEnum(AcademicYearEnum)
  academicYear: AcademicYearEnum;

  @IsNotEmpty()
  @IsEnum(SemesterEnum)
  semester: SemesterEnum;

  @IsNotEmpty()
  @IsString()
  professorEmail: string; //Saved on Studyplan not course 

  @IsOptional()
  @IsBoolean()
  isTraining: boolean;

}