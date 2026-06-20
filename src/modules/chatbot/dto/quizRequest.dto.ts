import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator';

export enum QuizDifficultyEnum {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MIXED = 'mixed',
}

export class QuizRequestDto {
  @IsOptional()
  @IsEnum(QuizDifficultyEnum)
  difficulty?: QuizDifficultyEnum = QuizDifficultyEnum.MIXED;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(15)
  num_questions?: number = 5;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;
}