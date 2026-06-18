import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    // صورة اختيارية
    @IsOptional()
    @IsUrl({}, { message: 'Please provide a valid URL' })
    url?: string;
}