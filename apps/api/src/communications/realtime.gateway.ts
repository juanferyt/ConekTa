import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthUser, JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from './communications.service';
import { RealtimeMessageDto, RealtimeSignalDto, TypingDto } from './dto/communications.dto';

interface AuthenticatedSocket extends Socket {
  data: { user?: AuthUser; conversations?: Set<string>; authentication?: Promise<void> };
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly communications: CommunicationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    client.data.authentication = this.authenticate(client);
    try {
      await client.data.authentication;
    } catch {
      client.disconnect(true);
    }
  }
  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (user)
      for (const conversationId of client.data.conversations ?? [])
        client
          .to(this.room(conversationId))
          .emit('presence:changed', { conversationId, userId: user.id, online: false });
  }
  @SubscribeMessage('conversation:join')
  async join(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    await client.data.authentication;
    const user = this.user(client);
    await this.communications.assertConversationAccess(user, body.conversationId);
    await client.join(this.room(body.conversationId));
    client.data.conversations?.add(body.conversationId);
    client
      .to(this.room(body.conversationId))
      .emit('presence:changed', {
        conversationId: body.conversationId,
        userId: user.id,
        online: true,
      });
    return { ok: true };
  }
  @SubscribeMessage('message:send')
  async message(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: RealtimeMessageDto,
  ) {
    const user = this.user(client);
    this.ensureJoined(client, body.conversationId);
    const message = await this.communications.send(user, body.conversationId, body);
    this.server.to(this.room(body.conversationId)).emit('message:new', message);
    return message;
  }
  @SubscribeMessage('call:signal')
  signal(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: RealtimeSignalDto) {
    const user = this.user(client);
    this.ensureJoined(client, body.conversationId);
    client.to(this.room(body.conversationId)).emit('call:signal', { ...body, fromUserId: user.id });
  }
  @SubscribeMessage('typing:set')
  typing(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: TypingDto) {
    const user = this.user(client);
    this.ensureJoined(client, body.conversationId);
    client.to(this.room(body.conversationId)).emit('typing:changed', { ...body, userId: user.id });
  }
  private user(client: AuthenticatedSocket) {
    if (!client.data.user) throw new WsException('No autenticado');
    return client.data.user;
  }
  private async authenticate(client: AuthenticatedSocket) {
    const origin = client.handshake.headers.origin;
    const allowed = this.config
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((item) => item.trim());
    if (origin && !allowed.includes(origin)) throw new Error('Origen no permitido');
    const token =
      typeof client.handshake.auth.token === 'string' ? client.handshake.auth.token : '';
    const payload = await this.jwt.verifyAsync<JwtPayload>(token);
    if (payload.type !== 'access') throw new Error('Token no válido');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true, emailVerified: true },
    });
    if (!user?.active) throw new Error('Usuario inactivo');
    client.data.user = user;
    client.data.conversations = new Set();
  }
  private ensureJoined(client: AuthenticatedSocket, id: string) {
    if (!client.data.conversations?.has(id))
      throw new WsException('Debes ingresar a la conversación');
  }
  private room(id: string) {
    return `conversation:${id}`;
  }
}
