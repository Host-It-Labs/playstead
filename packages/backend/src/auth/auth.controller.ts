import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { authCredentialsSchema } from '@playstead/shared';
import { parseInput } from '../common/validation.js';
import type { UserEntity } from '../database/entities.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.auth.register(parseInput(authCredentialsSchema, body));
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.login(parseInput(authCredentialsSchema, body));
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: UserEntity) {
    return { user: this.auth.publicUser(user) };
  }
}
