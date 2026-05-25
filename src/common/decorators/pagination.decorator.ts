import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Interface بتاعع define شكل الـ Pagination
export interface IPagination {
  page: number;
  limit: number;
  skip: number; // ده اللي المونجو بيستخدمه عشان يتخطى الصفحات
}

// الديكوريتور نفسه
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IPagination => {
    const request = ctx.switchToHttp().getRequest();
    
    // نجيب القيم من الـ URL (Query Parameters)
    // لو مستخدم مابعتش حاجة، الـ Page بتبقى 1 والـ Limit بتبقى 10
    let page = parseInt(request.query.page) || 1;
    let limit = parseInt(request.query.limit) || 10;
    
    // حماية: الصفحة ماتكونش أقل من 1
    if (page < 1) page = 1;
    
    // حماية: مفيش حد يطلب أكثر من 100 في نفس الوقت عشان السيرفر مايقعش
    if (limit > 100) limit = 100; 

    return {
      page,
      limit,
      // القاعدة الرياضية لتخطي العناصر: (الصفحة الحالية - 1) * عدد العناصر
      skip: (page - 1) * limit,
    };
  },
);