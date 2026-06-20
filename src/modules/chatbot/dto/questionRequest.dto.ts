import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator';
import { LanguageEnum } from './summarize.dto';

export enum QuestionTypeEnum {
  MCQ = 'mcq',
  ESSAY = 'essay',
  TRUE_FALSE = 'true_false',
  MIXED = 'mixed',
}

export class QuestionRequestDto {
  @IsOptional()
  @IsEnum(LanguageEnum)
  language?: LanguageEnum = LanguageEnum.EN;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  page_range?: string;

  @IsOptional()
  @IsEnum(QuestionTypeEnum)
  question_type?: QuestionTypeEnum = QuestionTypeEnum.MIXED;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  num_questions?: number = 5;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;
}