# HTTP and Socket.IO contract

All HTTP routes are prefixed with `/api`. Protected requests use
`Authorization: Bearer <token>`. Socket.IO uses `auth: { token }` during the handshake.

## Authentication

- `POST /auth/register` `{ handle, password }` → `{ token, user }`
- `POST /auth/login` `{ handle, password }` → `{ token, user }`
- `GET /auth/me` → `{ user }`

## Atlas Drop daily expedition

- `POST /games/atlas-drop/daily/start` resumes or creates today’s session.
- `POST /games/atlas-drop/daily/:sessionId/guess` `{ lat, lng }` accepts one guess for the
  current round and returns the updated session plus `lastReveal`.
- `GET /games/atlas-drop/daily/:sessionId` returns the current resumable session.

Before a guess, `target` exposes only the prompt, kind, round, and multiplier. Coordinates,
answer name, and story appear only in `lastReveal` and completed round results.
Each installation generates one unpredictable target set per local calendar date and stores it
in PostgreSQL so every player receives the same expedition, including across restarts.

## Leaderboards

- `GET /leaderboards/daily?date=YYYY-MM-DD&limit=50`
- `GET /leaderboards/all-time?limit=50`
- `GET /leaderboards/multiplayer?limit=50`

## Chat

- `GET /chat/rooms` returns the Commons plus circles joined by the player.
- `POST /chat/rooms` `{ name }` creates a circle and its invite code.
- `POST /chat/rooms/join` `{ inviteCode }` joins a circle.
- `GET /chat/rooms/:roomId/messages?before=<ISO>&limit=50` returns newest-first history.

Client events:

- `chat:subscribe` `{ roomId }`
- `chat:send` `{ roomId, body, clientNonce }`
- `chat:delete` `{ messageId }`

Server events:

- `chat:message`
- `chat:message_deleted`

Every client event uses a Socket.IO acknowledgement of `{ ok: true, data? }` or
`{ ok: false, error: { code, message } }`.

## Live tables

- `POST /matches` `{ visibility }` creates a live table.
- `GET /matches/public` lists open public lobbies without exposing game targets.
- `POST /matches/join` `{ code }` joins a lobby or resumes it for an existing participant.
- `GET /matches/:matchId` returns a player-safe snapshot; private tables require membership.

Client events:

- `match:subscribe` `{ matchId }`
- `match:ready` `{ matchId, ready }`
- `match:start` `{ matchId }` (host only)
- `match:guess` `{ matchId, lat, lng }`

Server event `match:update` carries the complete player-safe snapshot. Target coordinates are
withheld in `round_open` and included only in `round_reveal` or `finished`. A submitted
player's score delta is also hidden until the reveal so it cannot be used to triangulate the
target while other players are still choosing.
