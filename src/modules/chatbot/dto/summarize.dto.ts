import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum LanguageEnum {
  EN = 'en',
  AR = 'ar',
}

// الـ schema ده بيتستخدم في endpoint-ين: /summarize و /extract_keypoints
// لأن الاتنين عندهم نفس الـ body بالظبط في الـ OpenAPI
export class SummarizeDto {
  @IsOptional()
  @IsEnum(LanguageEnum)
  language?: LanguageEnum = LanguageEnum.EN;

  // مثال: "1-5" أو "3"
  @IsOptional()
  @IsString()
  @MaxLength(32)
  page_range?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;
}