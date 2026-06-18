import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { UploadController } from './cloudinary.controller';

@Module({
  controllers: [UploadController],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}