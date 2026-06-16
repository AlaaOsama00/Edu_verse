import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file);
    return {
      message: 'File Uploaded Successfully',
      url: result.secure_url, // هذا هو الرابط الذي سيتم حفظه في قاعدة البيانات
      format: result.format,
      type: result.resource_type,
    };
  }
}