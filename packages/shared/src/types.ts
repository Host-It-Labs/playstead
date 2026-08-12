export type User = {
  id: string;
  handle: string;
  createdAt: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type AtlasTargetKind = 'city' | 'landmark' | 'nature';

export type AtlasPublicTarget = {
  prompt: string;
  kind: AtlasTargetKind;
  round: number;
  multiplier: number;
};

export type AtlasRevealedTarget = AtlasPublicTarget & {
  id: string;
  name: string;
  lat: number;
  lng: number;
  story: string;
};

export type AtlasRoundResult = {
  round: number;
  guess: Coordinates;
  target: AtlasRevealedTarget;
  distanceKm: number;
  score: number;
  guessedAt: string;
};

export type DailySessionStatus = 'in_progress' | 'completed';

export type DailySession = {
  id: string;
  date: string;
  status: DailySessionStatus;
  currentRound: number;
  totalRounds: number;
  totalScore: number;
  target: AtlasPublicTarget | null;
  results: AtlasRoundResult[];
  completedAt: string | null;
};

export type DailySessionResponse = { session: DailySession };
export type DailyGuessResponse = {
  session: DailySession;
  lastReveal: AtlasRoundResult;
};

export type LeaderboardUser = Pick<User, 'id' | 'handle'>;

export type LeaderboardEntry = {
  rank: number;
  user: LeaderboardUser;
  score: number;
  gamesPlayed: number;
  achievedAt: string | null;
};

export type LeaderboardResponse = {
  kind: 'daily' | 'all-time' | 'multiplayer';
  date?: string;
  entries: LeaderboardEntry[];
};

export type ChatRoomKind = 'commons' | 'circle';

export type ChatRoom = {
  id: string;
  kind: ChatRoomKind;
  name: string;
  inviteCode: string | null;
  memberCount: number;
  createdAt: string;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  user: LeaderboardUser;
  body: string | null;
  clientNonce: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type ChatRoomsResponse = { rooms: ChatRoom[] };
export type ChatMessagesResponse = {
  messages: ChatMessage[];
  nextBefore: string | null;
};

export type MatchVisibility = 'public' | 'private';
export type MatchState = 'lobby' | 'round_open' | 'round_reveal' | 'finished';

export type MatchPlayer = {
  userId: string;
  handle: string;
  ready: boolean;
  totalScore: number;
  roundScore: number | null;
  hasGuessed: boolean;
  isHost: boolean;
};

export type MatchSnapshot = {
  id: string;
  code: string;
  visibility: MatchVisibility;
  state: MatchState;
  hostUserId: string;
  players: MatchPlayer[];
  round: number;
  totalRounds: number;
  target: AtlasPublicTarget | AtlasRevealedTarget | null;
  deadlineAt: string | null;
  revealEndsAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type PublicMatchSummary = {
  id: string;
  code: string;
  visibility: 'public';
  state: 'lobby';
  host: LeaderboardUser;
  playerCount: number;
  createdAt: string;
};

export type PublicMatchesResponse = { matches: PublicMatchSummary[] };

export type SocketError = { code: string; message: string };
export type SocketAck<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: SocketError };

export type ChatMessageDeletedEvent = {
  roomId: string;
  messageId: string;
  deletedAt: string;
};
