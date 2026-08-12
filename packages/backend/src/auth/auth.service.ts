import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { AuthCredentialsInput, User } from '@playstead/shared';
import { UserEntity } from '../database/entities.js';

type TokenPayload = { sub: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async register(input: AuthCredentialsInput): Promise<{ token: string; user: User }> {
    const normalized = input.handle.toLocaleLowerCase('en-US');
    const existing = await this.users.findOneBy({ handleNormalized: normalized });
    if (existing) throw new ConflictException('That handle is already taken');
    const user = this.users.create({
      handle: input.handle,
      handleNormalized: normalized,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    try {
      await this.users.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('That handle is already taken');
      }
      throw error;
    }
    return this.sessionFor(user);
  }

  async login(input: AuthCredentialsInput): Promise<{ token: string; user: User }> {
    const user = await this.users.findOneBy({
      handleNormalized: input.handle.toLocaleLowerCase('en-US'),
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Handle or password is incorrect');
    }
    return this.sessionFor(user);
  }

  async userFromToken(token: string): Promise<UserEntity> {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      const user = await this.users.findOneBy({ id: payload.sub });
      if (!user) throw new UnauthorizedException('Your session is no longer valid');
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Your session is no longer valid');
    }
  }

  publicUser(user: UserEntity): User {
    return { id: user.id, handle: user.handle, createdAt: user.createdAt.toISOString() };
  }

  private async sessionFor(user: UserEntity): Promise<{ token: string; user: User }> {
    return {
      token: await this.jwt.signAsync({ sub: user.id }, { expiresIn: 60 * 60 * 24 * 30 }),
      user: this.publicUser(user),
    };
  }
}
