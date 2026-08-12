import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  ChatMessage,
  ChatMessageDeletedEvent,
  ChatMessagesResponse,
  ChatRoom,
  ChatRoomsResponse,
  ChatSendInput,
  CreateChatRoomInput,
  JoinChatRoomInput,
} from '@playstead/shared';
import { randomBytes } from 'node:crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import {
  ChatMessageEntity,
  ChatRoomEntity,
  ChatRoomMemberEntity,
  UserEntity,
} from '../database/entities.js';

export const COMMONS_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoomEntity) private readonly rooms: Repository<ChatRoomEntity>,
    @InjectRepository(ChatRoomMemberEntity)
    private readonly members: Repository<ChatRoomMemberEntity>,
    @InjectRepository(ChatMessageEntity) private readonly messages: Repository<ChatMessageEntity>,
  ) {}

  async listRooms(userId: string): Promise<ChatRoomsResponse> {
    const roomEntities = await this.rooms
      .createQueryBuilder('room')
      .leftJoin(
        ChatRoomMemberEntity,
        'member',
        'member.room_id = room.id AND member.user_id = :userId',
        {
          userId,
        },
      )
      .where('room.kind = :commons OR member.user_id IS NOT NULL', { commons: 'commons' })
      .orderBy('room.kind', 'ASC')
      .addOrderBy('room.createdAt', 'ASC')
      .getMany();
    return { rooms: await Promise.all(roomEntities.map((room) => this.serializeRoom(room))) };
  }

  async createRoom(userId: string, input: CreateChatRoomInput): Promise<{ room: ChatRoom }> {
    let room: ChatRoomEntity | undefined;
    for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
      const candidate = this.rooms.create({
        kind: 'circle',
        name: input.name,
        inviteCode: this.inviteCode(),
        createdById: userId,
      });
      try {
        room = await this.rooms.save(candidate);
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    if (!room) throw new Error('Could not allocate a unique circle code');
    await this.members.save(this.members.create({ roomId: room.id, userId }));
    return { room: await this.serializeRoom(room) };
  }

  async joinRoom(userId: string, input: JoinChatRoomInput): Promise<{ room: ChatRoom }> {
    const room = await this.rooms.findOneBy({ inviteCode: input.inviteCode, kind: 'circle' });
    if (!room) throw new NotFoundException('Circle invite not found');
    await this.members.upsert({ roomId: room.id, userId }, ['roomId', 'userId']);
    return { room: await this.serializeRoom(room) };
  }

  async history(
    userId: string,
    roomId: string,
    before: string | undefined,
    limit: number,
  ): Promise<ChatMessagesResponse> {
    await this.assertAccess(userId, roomId);
    const messages = await this.messages.find({
      where: { roomId, ...(before ? { createdAt: LessThan(new Date(before)) } : {}) },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit + 1,
    });
    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit);
    return {
      messages: page.map((message) => this.serializeMessage(message)),
      nextBefore: hasMore ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
    };
  }

  async send(user: UserEntity, input: ChatSendInput): Promise<ChatMessage> {
    await this.assertAccess(user.id, input.roomId);
    const existing = await this.messages.findOne({
      where: { userId: user.id, clientNonce: input.clientNonce },
      relations: { user: true },
    });
    if (existing) return this.serializeMessage(existing);
    const entity = this.messages.create({
      roomId: input.roomId,
      userId: user.id,
      body: input.body,
      clientNonce: input.clientNonce,
      deletedAt: null,
      user,
    });
    try {
      return this.serializeMessage(await this.messages.save(entity));
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
      const duplicate = await this.messages.findOneOrFail({
        where: { userId: user.id, clientNonce: input.clientNonce },
        relations: { user: true },
      });
      return this.serializeMessage(duplicate);
    }
  }

  async delete(userId: string, messageId: string): Promise<ChatMessageDeletedEvent> {
    const message = await this.messages.findOneBy({ id: messageId, deletedAt: IsNull() });
    if (!message) throw new NotFoundException('Message not found');
    if (message.userId !== userId)
      throw new ForbiddenException('You can only delete your own messages');
    message.body = null;
    message.deletedAt = new Date();
    await this.messages.save(message);
    return {
      roomId: message.roomId,
      messageId: message.id,
      deletedAt: message.deletedAt.toISOString(),
    };
  }

  async assertAccess(userId: string, roomId: string): Promise<ChatRoomEntity> {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Chat room not found');
    if (room.kind === 'circle' && !(await this.members.existsBy({ roomId, userId }))) {
      throw new ForbiddenException('Join this circle before opening it');
    }
    return room;
  }

  private async serializeRoom(room: ChatRoomEntity): Promise<ChatRoom> {
    const [circleMembers, latest] = await Promise.all([
      room.kind === 'commons' ? Promise.resolve(0) : this.members.countBy({ roomId: room.id }),
      this.messages.findOne({ where: { roomId: room.id }, order: { createdAt: 'DESC' } }),
    ]);
    return {
      id: room.id,
      kind: room.kind,
      name: room.name,
      inviteCode: room.inviteCode,
      memberCount: circleMembers,
      createdAt: room.createdAt.toISOString(),
      lastMessageAt: latest?.createdAt.toISOString() ?? null,
    };
  }

  private serializeMessage(message: ChatMessageEntity): ChatMessage {
    return {
      id: message.id,
      roomId: message.roomId,
      user: { id: message.userId, handle: message.user.handle },
      body: message.body,
      clientNonce: message.clientNonce,
      createdAt: message.createdAt.toISOString(),
      deletedAt: message.deletedAt?.toISOString() ?? null,
    };
  }

  private inviteCode(): string {
    return randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
  }
}
