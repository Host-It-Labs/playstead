import { Logger } from '@nestjs/common';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  chatDeleteSchema,
  chatSendSchema,
  chatSubscribeSchema,
  matchGuessSchema,
  matchReadySchema,
  matchStartSchema,
  matchSubscribeSchema,
  type ChatMessage,
  type ChatMessageDeletedEvent,
  type MatchSnapshot,
  type SocketAck,
} from '@playstead/shared';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { parseInput } from '../common/validation.js';
import type { UserEntity } from '../database/entities.js';
import { ChatService } from '../chat/chat.service.js';
import { MatchesService } from '../matches/matches.service.js';

type AuthenticatedSocket = Socket & { data: { user?: UserEntity } };
type SocketAcknowledgement<T = undefined> = (result: SocketAck<T>) => void;

@WebSocketGateway({
  path: '/socket.io',
  cors: { origin: process.env.APP_ORIGIN ?? 'http://localhost:5173' },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly auth: AuthService,
    private readonly chat: ChatService,
    private readonly matches: MatchesService,
  ) {}

  afterInit(): void {
    this.matches.setEmitter((snapshot) =>
      this.server.to(this.matchRoom(snapshot.id)).emit('match:update', snapshot),
    );
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const token = client.handshake.auth.token;
    if (typeof token !== 'string') {
      client.disconnect(true);
      return;
    }
    try {
      client.data.user = await this.auth.userFromToken(token);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:subscribe')
  async chatSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.user(client);
      const input = parseInput(chatSubscribeSchema, body);
      await this.chat.assertAccess(user.id, input.roomId);
      await client.join(this.chatRoom(input.roomId));
      return undefined;
    });
  }

  @SubscribeMessage('chat:send')
  async chatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<ChatMessage>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const message = await this.chat.send(this.user(client), parseInput(chatSendSchema, body));
      this.server.to(this.chatRoom(message.roomId)).emit('chat:message', message);
      return message;
    });
  }

  @SubscribeMessage('chat:delete')
  async chatDelete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<ChatMessageDeletedEvent>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const event = await this.chat.delete(
        this.user(client).id,
        parseInput(chatDeleteSchema, body).messageId,
      );
      this.server.to(this.chatRoom(event.roomId)).emit('chat:message_deleted', event);
      return event;
    });
  }

  @SubscribeMessage('match:subscribe')
  async matchSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<MatchSnapshot>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const input = parseInput(matchSubscribeSchema, body);
      const snapshot = await this.matches.assertSubscription(this.user(client).id, input.matchId);
      await client.join(this.matchRoom(input.matchId));
      return snapshot;
    });
  }

  @SubscribeMessage('match:ready')
  async matchReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<MatchSnapshot>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const input = parseInput(matchReadySchema, body);
      return this.matches.ready(this.user(client).id, input.matchId, input.ready);
    });
  }

  @SubscribeMessage('match:start')
  async matchStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<MatchSnapshot>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const input = parseInput(matchStartSchema, body);
      return this.matches.start(this.user(client).id, input.matchId);
    });
  }

  @SubscribeMessage('match:guess')
  async matchGuess(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
    @Ack() ack: SocketAcknowledgement<MatchSnapshot>,
  ): Promise<void> {
    await this.respond(ack, async () =>
      this.matches.guess(this.user(client).id, parseInput(matchGuessSchema, body)),
    );
  }

  private user(client: AuthenticatedSocket): UserEntity {
    const user = client.data.user;
    if (!user) throw new Error('Socket is not authenticated');
    return user;
  }

  private async respond<T>(ack: SocketAcknowledgement<T>, action: () => Promise<T>): Promise<void> {
    try {
      const data = await action();
      ack({ ok: true, data } as SocketAck<T>);
    } catch (error) {
      const response =
        typeof (error as { getResponse?: () => unknown }).getResponse === 'function'
          ? (error as { getResponse: () => unknown }).getResponse()
          : null;
      const message =
        typeof response === 'string'
          ? response
          : typeof response === 'object' && response && 'message' in response
            ? String((response as { message: unknown }).message)
            : error instanceof Error
              ? error.message
              : 'Something went wrong';
      this.logger.warn(message);
      ack({ ok: false, error: { code: 'REQUEST_FAILED', message } });
    }
  }

  private chatRoom(roomId: string): string {
    return `chat:${roomId}`;
  }

  private matchRoom(matchId: string): string {
    return `match:${matchId}`;
  }
}
