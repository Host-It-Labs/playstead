# Contributing to Playstead

Thank you for proposing an improvement. Search existing issues first and keep pull
requests focused on one behavior or maintenance concern.

1. Fork the repository and create a topic branch.
2. Use Node.js 24 and install dependencies with `pnpm install --frozen-lockfile`.
3. Add coverage at the cheapest reliable test layer.
4. Run `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm format:check`.
5. Complete the pull request template and disclose generated code or external assets.

Keep scoring and match transitions server-authoritative. Use TypeORM migrations rather
than schema synchronization, validate network inputs, and keep PostgreSQL canonical.

Do not include credentials, production data, private URLs, signing files, or third-party
assets without provenance.

By submitting a contribution, you agree that it is licensed under the same
PolyForm Noncommercial License 1.0.0 terms as Playstead.

By participating, follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security
problems through [SECURITY.md](SECURITY.md), not a public issue.
