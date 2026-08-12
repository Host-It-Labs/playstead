# Agent guidelines

- Read `CONTEXT.md` and `DESIGN.md` before product or UI changes.
- Use pnpm and Node 24.
- Keep game scoring and match transitions server-authoritative.
- Use TypeORM migrations; never enable `synchronize`.
- Validate HTTP and Socket.IO inputs with shared Zod schemas or Nest DTOs.
- PostgreSQL is canonical. Redis is for presence, fan-out, and disposable coordination only.
- Do not add remote map or analytics dependencies to the default self-hosted experience.
- Run `pnpm build`, `pnpm test`, and `pnpm lint` for changes.
