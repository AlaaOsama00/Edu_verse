import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import 'multer';

@Injectable()
export class CloudinaryService {
  // الـ CloudinaryProvider بيظبط الـ SDK تلقائي وقت الـ app يبدأ
  // فمش محتاجين نـ inject حاجة هنا — بس نستخدم cloudinary مباشرة

  // ==========================================
  // رفع ملف (صورة أو PDF) من الـ Buffer اللي جاي من Multer
  // ==========================================
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'community/posts',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('Nothing Uploaded');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          // resource_type: auto بيخلي Cloudinary يحدد لوحده
          // لو صورة هيتعامل معاها كـ image، لو PDF هيتعامل معاها كـ raw
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new BadRequestException('Error occurred when uploading this file, please try again.',error?.message),
            );
          }
          resolve(result);
        },
      );

      // نحول الـ Buffer لـ Readable Stream ونضخه في الـ upload stream
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  // ==========================================
  // حذف ملف من Cloudinary (مفيد لما نمسح بوست أو resource)
  // ==========================================
  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  // ==========================================
  // استخراج الـ public_id من الـ URL — محتاجينه لو عايزين نمسح الملف بعدين
  // مثال: https://res.cloudinary.com/xxx/image/upload/v123/community/posts/abc123.jpg
  // بيرجع: community/posts/abc123
  // ==========================================
  extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
  }


  async uploadAssignment(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'eduverse/assignments', // الفولدر اللي هيتكريت في Cloudinary
          resource_type: 'auto', // عشان يقبل أي نوع ملف (PDF, Word, صور)
        },
           (error, result) => {
          if (error || !result) {
            return reject(
              new BadRequestException('Error occurred when uploading this file, please try again.',error?.message),
            );
          }
          resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}