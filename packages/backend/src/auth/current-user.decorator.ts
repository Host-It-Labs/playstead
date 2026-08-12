import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserEntity } from '../database/entities.js';
import type { AuthenticatedRequest } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserEntity =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
