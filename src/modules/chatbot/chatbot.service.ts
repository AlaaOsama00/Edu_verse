import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';

import { ChatDto } from './dto/chat.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { QuestionRequestDto } from './dto/questionRequest.dto';
import { QuizRequestDto } from './dto/quizRequest.dto';
import { SubmitAnswersDto } from './dto/submitAnswers.dto';


@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  // ⚠️ هنا بالظبط فين بيتعمل instance من axios بيكلم اللينك الخارجي
  private readonly api: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('CHATBOT_API_URL');

    this.api = axios.create({
      baseURL: baseUrl, // مثال: https://web-production-faf88.up.railway.app
      timeout: 40000,   // 30 ثانية — الـ AI ممكن ياخد وقت في التوليد
    });
  }

  // ==========================================
  // رفع PDF — multipart/form-data
  // ==========================================
  async uploadPdf(file: Express.Multer.File, sessionId: string | undefined) {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    if (sessionId) {
      form.append('session_id', sessionId);
    }

    return this.request('post', '/upload_pdf', form, {
      headers: {
        ...form.getHeaders(),
        ...(sessionId ? { 'x-session-id': sessionId } : {}),
      },
    });
  }

  // محادثة مع الـ AI — auto / pdf / roadmap / cs_mentor
  async chat(dto: ChatDto) {
    return this.request('post', '/chat', dto);
  }

  // جيب تاريخ المحادثة بتاعة session معينة
  async getChatHistory(sessionId: string) {
    return this.request('get', `/chat/history/${sessionId}`);
  }

  // امسح تاريخ المحادثة بتاعة session معينة
  async clearChatHistory(sessionId: string) {
    return this.request('delete', `/chat/history/${sessionId}`);
  }

  // تلخيص الـ PDF المرفوع
  async summarize(dto: SummarizeDto) {
    return this.request('post', '/summarize', dto);
  }

  // استخراج النقاط الرئيسية من الـ PDF (نفس الـ body بتاع summarize)
  async extractKeypoints(dto: SummarizeDto) {
    return this.request('post', '/extract_keypoints', dto);
  }

  // توليد أسئلة (mcq / essay / true_false / mixed)
  async generateQuestions(dto: QuestionRequestDto) {
    return this.request('post', '/generate_questions', dto);
  }

  // توليد كويز اختيار من متعدد
  async generateMcq(dto: QuizRequestDto) {
    return this.request('post', '/generate_mcq', dto);
  }

  // تسليم إجابات الكويز للتصحيح
  async submitAnswers(dto: SubmitAnswersDto) {
    return this.request('post', '/submit_answers', dto);
  }

  // ==========================================
  // الدالة دي هي قلب الموضوع — هي اللي فعلياً بتروح
  // تكلم الـ FastAPI على Railway وتجيب الـ response منه
  // كل الـ methods اللي فوق بتنادي عليها هي بس
  // ==========================================
  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: any,
    config?: any,
  ) {
    try {
      // 👇 ده السطر اللي فعلياً بيبعت الـ HTTP request للينك بتاعك
      // باستخدام axios instance اللي اتعمل فوق في الـ constructor
      console.log(`Calling: ${this.api.defaults.baseURL}${path}`, data);
      const response = await this.api.request({
        method,
        url: path,
        data,
        ...config,
      });

      // 👇 ده الـ response.data الراجع فعلياً من السيرفر بتاعك على Railway
      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(
        `Chatbot API error on ${method.toUpperCase()} ${path}: ${error.message}`,
      );

      // لو الـ AI Service رجّع error response واضح، نمرره زي ما هو
      if (error.response) {
        throw new BadGatewayException({
          message: 'فشل التواصل مع خدمة الـ AI',
          details: error.response.data,
        });
      }

      // مشكلة شبكة أو السيرفر الخارجي واقع خالص
      throw new BadGatewayException('خدمة الـ AI مش متاحة دلوقتي، حاول تاني بعد شوية');
    }
  }
}