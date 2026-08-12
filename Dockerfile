# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.5 --activate
RUN apk add --no-cache g++ make python3

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:24-alpine AS backend

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

# Keep the workspace layout so TypeORM migrations and workspace packages resolve in
# exactly the same way as they do in CI. The build stage contains no source secrets.
COPY --from=build /app /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@playstead/backend", "start:prod"]

FROM caddy:2.10-alpine AS frontend

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/frontend/dist /srv

EXPOSE 8080
