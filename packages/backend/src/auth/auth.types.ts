import type { UserEntity } from '../database/entities.js';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user: UserEntity;
};
