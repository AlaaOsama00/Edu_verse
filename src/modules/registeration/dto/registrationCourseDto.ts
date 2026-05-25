import { IsArray, ArrayMinSize, ArrayMaxSize, IsMongoId } from 'class-validator';

export class RegisterCoursesDto {
  
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(5) // القانون: بالظبط 5 مواد
  @IsMongoId({ each: true })
  courseIds: string[];
}