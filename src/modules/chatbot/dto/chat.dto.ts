import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum ChatLevelEnum {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ChatModeEnum {
  AUTO = 'auto',
  PDF = 'pdf',
  ROADMAP = 'roadmap',
  CS_MENTOR = 'cs_mentor',
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  question: string;

  @IsOptional()
  @IsEnum(ChatLevelEnum)
  level?: ChatLevelEnum = ChatLevelEnum.INTERMEDIATE;

  // ⚠️ الفرونت هو اللي بيبعته ويخزنه — احنا مش بنولده ولا بنخزنه
  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;

  @IsOptional()
  @IsEnum(ChatModeEnum)
  mode?: ChatModeEnum = ChatModeEnum.AUTO;
}