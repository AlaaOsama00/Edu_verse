import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import 'multer';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      // تحديد نوع المورد بناءً على نوع الملف
      let resourceType: 'auto' | 'raw' | 'video' | 'image' = 'auto';
      
      const isDocument = 
        file.mimetype === 'application/pdf' || 
        file.mimetype.includes('wordprocessingml') || 
        file.mimetype.includes('msword');

      if (isDocument) {
        resourceType = 'raw'; // ضروري لملفات الـ PDF والـ Word
      } else if (file.mimetype.includes('video')) {
        resourceType = 'video';
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'eduverse_uploads', // مجلد مخصص داخل Cloudinary
          resource_type: resourceType,
        },
        (error, result) => {
          if (error)
            throw new InternalServerErrorException('Failed to upload file to Cloudinary' );
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}