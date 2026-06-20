import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsInt()
  @Min(0)
  @Max(100)
  question_index: number;

  // الـ API بتقبل حروف كبيرة وصغيرة في نفس الوقت
  @IsIn(['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'])
  selected: string;
}

export class SubmitAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;
}