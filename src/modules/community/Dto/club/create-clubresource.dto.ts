import { IsNotEmpty,IsString, IsUrl } from 'class-validator';

export class CreateClubResourceDto {
    @IsString()
    @IsNotEmpty()
    title: string; // مثال: Course Materials

    @IsUrl()
    @IsString()
    @IsNotEmpty()
    type: string; //post link 

    @IsUrl()
    @IsNotEmpty()
    url: string;
}