import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '@decorators/authDecorator';
import { UserRolesEnum } from '@utils/enum';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { QuestionRequestDto } from './dto/questionRequest.dto';
import { QuizRequestDto } from './dto/quizRequest.dto';
import { SubmitAnswersDto } from './dto/submitAnswers.dto';


@Controller('chatbot')
@Auth(UserRolesEnum.STUDENT)
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    // ==========================================
    // POST /chatbot/upload-pdf
    // الفرونت بيبعت الملف + session_id (لو موجود) في الـ form-data
    // ==========================================
    @Post('upload-pdf')
    @UseInterceptors(FileInterceptor('file'))
    async uploadPdf(
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: true,
                validators: [
                    new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // 25MB
                    new FileTypeValidator({ fileType: /(pdf)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body('session_id') sessionId?: string,
    ) {
        return this.chatbotService.uploadPdf(file, sessionId);
    }

    // POST /chatbot/chat
    @Post('chat')
    async chat(@Body() dto: ChatDto) {
        return this.chatbotService.chat(dto);
    }

    // GET /chatbot/chat/history/:sessionId
    @Get('chat/history/:sessionId')
    async getChatHistory(@Param('sessionId') sessionId: string) {
        return this.chatbotService.getChatHistory(sessionId);
    }

    // DELETE /chatbot/chat/history/:sessionId
    @Delete('chat/history/:sessionId')
    async clearChatHistory(@Param('sessionId') sessionId: string) {
        return this.chatbotService.clearChatHistory(sessionId);
    }

    // POST /chatbot/summarize
    @Post('summarize')
    async summarize(@Body() dto: SummarizeDto) {
        return this.chatbotService.summarize(dto);
    }

    // POST /chatbot/extract-keypoints
    @Post('extract-keypoints')
    async extractKeypoints(@Body() dto: SummarizeDto) {
        return this.chatbotService.extractKeypoints(dto);
    }

    // POST /chatbot/generate-questions
    @Post('generate-questions')
    async generateQuestions(@Body() dto: QuestionRequestDto) {
        return this.chatbotService.generateQuestions(dto);
    }

    // POST /chatbot/generate-mcq
    @Post('generate-mcq')
    async generateMcq(@Body() dto: QuizRequestDto) {
        return this.chatbotService.generateMcq(dto);
    }

    // POST /chatbot/submit-answers
    @Post('submit-answers')
    async submitAnswers(@Body() dto: SubmitAnswersDto) {
        return this.chatbotService.submitAnswers(dto);
    }
}