import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

// ==========================================
// الفكرة: كل Club له "Room" منفصل بالـ Socket.IO
// لما الطالب يفتح صفحة الـ Club، الـ Frontend بيبعت "joinClubRoom"
// وبعد كل عملية (Comment / Like / Post) بنعمل emit بس لأهل الـ Room ده
// مش لكل الناس المتصلين بالسيرفر
// ==========================================

@Injectable()
@WebSocketGateway({
    cors: { origin: '*' }, // عدّلها على الدومين بتاعك في الـ Production
    namespace: '/community', // عشان نفصلها عن أي gateway تاني في المشروع
})
export class CommunityGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(CommunityGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // ==========================================
    // الطالب بيبعت الـ event ده وقت ما يفتح صفحة الـ Club
    // عشان يدخل الـ "room" بتاع الـ club ده ويستقبل تحديثاته
    // ==========================================
    @SubscribeMessage('joinClubRoom')
    async handleJoinClubRoom(@ConnectedSocket() client: Socket, @MessageBody() clubId: string,
    ) {
        await client.join(this.roomName(clubId)); // ضفنا await هنا
        this.logger.log(`Client ${client.id} joined room ${clubId}`);
    }
    // ==========================================
    // الطالب بيبعتها وقت ما يقفل الصفحة أو يطلع من الـ Club
    // ==========================================
    @SubscribeMessage('leaveClubRoom')
    async handleLeaveClubRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() clubId: string,
    ) {
        await client.leave(this.roomName(clubId));
    }

    // ==========================================
    // Helper — اسم الـ room بصيغة موحدة عشان منغلطش
    // ==========================================
    private roomName(clubId: string): string {
        return `club:${clubId}`;
    }

    // ==========================================
    // الدوال اللي الـ Services بتنادي عليها بعد ما تحفظ في الـ DB
    // ==========================================

    // بعد إضافة Comment جديد
    async emitNewComment(clubId: string, postId: string, comment: any) {
        await this.server.to(this.roomName(clubId)).emit('newComment', {
            postId,
            comment,
        });
    }

    // بعد حذف Comment
    async emitCommentDeleted(clubId: string, postId: string, commentId: string) {
        await this.server.to(this.roomName(clubId)).emit('commentDeleted', {
            postId,
            commentId,
        });
    }

    // بعد Like / Unlike — بنبعت العدد الجديد بس، مش كل الـ likes array
    async emitLikeUpdate(clubId: string, postId: string, likesCount: number, isLiked: boolean, userId: string) {
        await this.server.to(this.roomName(clubId)).emit('likeUpdate', {
            postId,
            likesCount,
            userId, // عشان كل client يعرف هو نفسه عمل لايك ولا مش هو
        });
    }

    // بعد إضافة Post جديد
     emitNewPost(clubId: string, post: any) {
         this.server.to(this.roomName(clubId)).emit('newPost', post);
    }

    // بعد حذف Post
     emitPostDeleted(clubId: string, postId: string) {
         this.server.to(this.roomName(clubId)).emit('postDeleted', { postId });
    }

     emitPostPinned(clubId: string, post: any) {
         this.server.to(this.roomName(clubId)).emit('postPinned', post);
    }

    // بعد ما الـ Admin يشيل الـ Pin — يختفي من Useful Resources فوراً عند الكل
     emitPostUnpinned(clubId: string, postId: string) {
         this.server.to(this.roomName(clubId)).emit('postUnpinned', { postId });
    }

    @SubscribeMessage('joinUserRoom')
    async handleJoinUserRoom(
        @ConnectedSocket() client: Socket, 
        @MessageBody() userId: string
    ) {
        await client.join(`user:${userId}`);
        this.logger.log(`Client ${client.id} joined global user room ${userId}`);
    }

    // ==========================================
    // الدالة دي اللي هنستدعيها من أي Service عشان نبعت إشعار للجرس
    // ==========================================
     emitNotificationToUser(userId: string, notification: any) {
         this.server.to(`user:${userId}`).emit('newBellNotification', notification);
    }
}