import { z } from 'zod';

const trimmedString = (min: number, max: number) => z.string().trim().min(min).max(max);

export const handleSchema = trimmedString(3, 24).regex(
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
  'Use letters, numbers, underscores, or dashes',
);
export const passwordSchema = z.string().min(8).max(128);
export const authCredentialsSchema = z.object({
  handle: handleSchema,
  password: passwordSchema,
});

export const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const sessionIdParamsSchema = z.object({ sessionId: z.string().uuid() });
export const guessSchema = coordinatesSchema.strict();

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const leaderboardQuerySchema = z.object({
  date: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createChatRoomSchema = z.object({ name: trimmedString(2, 48) }).strict();
export const joinChatRoomSchema = z
  .object({ inviteCode: trimmedString(6, 12).transform((value) => value.toUpperCase()) })
  .strict();
export const roomIdParamsSchema = z.object({ roomId: z.string().uuid() });
export const chatHistoryQuerySchema = z.object({
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const chatSubscribeSchema = z.object({ roomId: z.string().uuid() }).strict();
export const chatSendSchema = z
  .object({
    roomId: z.string().uuid(),
    body: trimmedString(1, 1000),
    clientNonce: z.string().uuid(),
  })
  .strict();
export const chatDeleteSchema = z.object({ messageId: z.string().uuid() }).strict();

export const matchVisibilitySchema = z.enum(['public', 'private']);
export const createMatchSchema = z.object({ visibility: matchVisibilitySchema }).strict();
export const joinMatchSchema = z
  .object({ code: trimmedString(6, 10).transform((value) => value.toUpperCase()) })
  .strict();
export const matchIdParamsSchema = z.object({ matchId: z.string().uuid() });
export const matchSubscribeSchema = z.object({ matchId: z.string().uuid() }).strict();
export const matchReadySchema = z
  .object({ matchId: z.string().uuid(), ready: z.boolean() })
  .strict();
export const matchStartSchema = z.object({ matchId: z.string().uuid() }).strict();
export const matchGuessSchema = z
  .object({ matchId: z.string().uuid(), ...coordinatesSchema.shape })
  .strict();

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
export type GuessInput = z.infer<typeof guessSchema>;
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;
export type JoinChatRoomInput = z.infer<typeof joinChatRoomSchema>;
export type ChatSendInput = z.infer<typeof chatSendSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type JoinMatchInput = z.infer<typeof joinMatchSchema>;
export type MatchGuessInput = z.infer<typeof matchGuessSchema>;
