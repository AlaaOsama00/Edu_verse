import { IsNumber, Min, Max } from 'class-validator';

export class RateCommunityDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;
}