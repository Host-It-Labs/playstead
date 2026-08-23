# Self-hosting Playstead

The supported deployment is Docker Compose with a public frontend/reverse-proxy
container, a private backend, PostgreSQL, Redis, and a one-shot migration container.
PostgreSQL is the only durable application store. Redis carries disposable presence
and real-time coordination state.

## Before the first start

1. Install Docker Engine with Docker Compose v2.
2. Copy `.env.docker.example` to `.env`.
3. Set `JWT_SECRET` to at least 32 random bytes and `POSTGRES_PASSWORD` to a separate,
   strong password. `openssl rand -hex 32` is a suitable way to generate each value.
4. Set `APP_ORIGIN` to the exact public origin, including `https://` in production.
5. Keep PostgreSQL and Redis unexposed. Only port 8080 (or `PLAYSTEAD_PORT`) needs to
   be reachable from the host.

`DAILY_TIME_ZONE` chooses the calendar boundary for daily expeditions and defaults to
`UTC`. Use an IANA time-zone name such as `Europe/Paris`. The optional
`MATCH_ROUND_SECONDS` and `MATCH_REVEAL_SECONDS` values set live-table pacing.

Start the installation:

```sh
docker compose up --build -d
docker compose ps
docker compose logs migrate backend
```

The `migrate` service waits for PostgreSQL, applies TypeORM migrations, and must exit
successfully before the backend starts. Caddy waits for `/api/health` to report backend
readiness, sends `/api` and
`/socket.io` to the backend and serves every other route as the frontend application.
The map boundary data under `/data` is part of the image; no remote map service is
needed for gameplay. Atlas Drop requests satellite XYZ tiles from
`/tiles/satellite/{z}/{x}/{y}.jpg` by default in production and automatically keeps the
bundled graphic map visible when a tile is missing.

To self-host imagery, mount an XYZ tile tree at `/srv/tiles/satellite` in the frontend
container. To use a hosted imagery service instead, set `VITE_SATELLITE_TILE_URL`,
`VITE_SATELLITE_TILE_ATTRIBUTION`, and `VITE_SATELLITE_TILE_MAX_ZOOM` before
`docker compose build`; these are compiled into the frontend. The URL must contain the
provider's `{z}`, `{x}`, and `{y}` placeholders. Always supply the attribution required by
the provider. Satellite tiles are presentation-only and never participate in scoring.

## TLS and an upstream proxy

The included Caddy listens for plain HTTP on container port 8080 so it works behind a
host-level reverse proxy such as Caddy, Traefik, or nginx. Terminate TLS at that proxy,
forward HTTP and WebSocket traffic to `127.0.0.1:${PLAYSTEAD_PORT}`, and preserve the
`Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers. Set `APP_ORIGIN` to the
external HTTPS origin.

Do not route `/socket.io` to a different instance without shared Socket.IO fan-out and
sticky-session support. A single backend replica is the default topology.

## Upgrade

Back up PostgreSQL first, update the checkout to the desired tagged release, then run:

```sh
docker compose up --build -d
docker compose ps
docker compose logs migrate backend
```

The migration service is safe to rerun because TypeORM records applied migrations.
Read release notes before downgrading: schema migrations are not guaranteed to be
backward-compatible.

## Backup and restore

Create a compressed logical backup without exposing PostgreSQL:

```sh
docker compose exec -T postgres pg_dump \
  --username playstead --dbname playstead --format=custom > playstead.dump
```

If `POSTGRES_USER` or `POSTGRES_DB` differs from the defaults, use those values in the
command. Test restoration periodically on a separate installation. A restore replaces
durable user, game, leaderboard, and chat history; stop the backend before restoring.
Redis does not need backup.

## Operational checks

- `docker compose ps` should show PostgreSQL and Redis healthy, `migrate` exited with
  code 0, and the backend and frontend running.
- `docker compose logs --since 10m backend` should not show repeated database,
  authentication, or Socket.IO errors.
- Loading `/data/countries.geojson` from the public origin should return a local JSON
  document, not redirect to a third party.
- If local satellite tiles are configured, loading `/tiles/satellite/0/0/0.jpg` should
  return an image. A missing tile should return 404, after which the graphic fallback stays visible.
- Monitor disk usage for the PostgreSQL volume and keep timestamped backups outside
  the Docker host.

## Security notes

- Never commit `.env`; it contains the JWT signing secret and database password.
- Run with a unique `JWT_SECRET` per installation. Rotating it signs out every player.
- Restrict registration at the network layer if the installation is intended for a
  private community.
- Apply OS and container-image updates regularly.
- The word “global” in the interface means this one installation. Playstead does not
  federate chat, accounts, or scores with other servers.
- Daily and live target sets are generated with server-side entropy and persisted before play.
  Players must not have database or server-source access during a competitive game; as with any
  source-available self-hosted trivia game, an installation administrator is inside the trust boundary.
