# Playstead

Playstead is a self-hostable place for friends and communities to play lightweight
social games together. Its first game, **Atlas Drop**, is a geography challenge: read
a location prompt, drop a pin on the world map, and score points for accuracy.

The experience is built around the whole table, not only the game board:

- a five-round daily expedition shared by everyone on an installation;
- server-authoritative scoring, answer reveals, and resumable progress;
- live multiplayer tables with ready states and synchronized rounds;
- daily, all-time, and multiplayer leaderboards;
- the Commons, an installation-wide real-time chat;
- private circles with names and invite codes; and
- a fully local world map with no required map, tile, analytics, or cloud service.

## Run with Docker

Docker Compose is the shortest path to a complete installation.

```sh
cp .env.docker.example .env
```

Open `.env`, generate and set independent `JWT_SECRET` and `POSTGRES_PASSWORD` values,
then start Playstead:

```sh
docker compose up --build -d
docker compose ps
```

Visit <http://localhost:8080>. On startup, Compose waits for PostgreSQL, runs every
pending database migration, starts the API and Socket.IO server, and then serves the
frontend through Caddy. See [the self-hosting guide](docs/operations/SELF_HOSTING.md)
for TLS, upgrades, backups, and production checks.

## Develop locally

Requirements:

- Node.js 24
- pnpm 9.15.5 (Corepack is recommended)
- PostgreSQL 17
- Redis 7

Create a development environment and install dependencies:

```sh
cp .env.example .env
corepack enable
pnpm install
pnpm migration:run
pnpm dev
```

The frontend runs on <http://localhost:5173> and the backend on
<http://localhost:3000>. Development may override `VITE_API_URL` and
`VITE_SOCKET_URL`; production deliberately uses same-origin `/api` and `/socket.io`
through Caddy.

Useful checks:

```sh
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm verify:map-data
```

## Architecture

- `packages/frontend`: React, TypeScript, Vite, Zustand, MapLibre, and Socket.IO client
- `packages/backend`: NestJS, TypeORM, PostgreSQL, Redis, and Socket.IO
- `packages/frontend/public/data`: vendored Natural Earth country geometry
- `docs/HTTP_AND_SOCKET_CONTRACT.md`: player-safe HTTP and real-time protocol
- `docs/operations/SELF_HOSTING.md`: deployment and operations runbook

Scores, guesses, messages, memberships, and match transitions are validated by the
backend. Target coordinates remain hidden until the reveal. PostgreSQL is canonical;
Redis is limited to presence, fan-out, and disposable live coordination.

## Data and licensing

Playstead source code is available under the [MIT License](LICENSE). The bundled
Natural Earth boundaries are public-domain data; exact source, version, and checksum
details are in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

Atlas Drop is an original, independent implementation inspired by the map-tapping
geography game genre. It does not include MapTap code, branding, or visual assets.
