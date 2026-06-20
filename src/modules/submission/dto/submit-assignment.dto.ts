import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SubmitAssignmentDto {
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  submissionFileUrl: string;
}