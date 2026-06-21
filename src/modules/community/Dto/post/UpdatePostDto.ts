import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePostDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;
}