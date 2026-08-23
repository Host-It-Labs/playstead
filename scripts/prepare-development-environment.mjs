import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = resolve(rootDir, '.playstead');
const runtimeFile = resolve(stateDir, 'dev-runtime.env');

const parseEnvironment = (source) => {
  const result = {};

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue;

    if (
      value.length >= 2 &&
      ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"')))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
};

const readEnvironment = (path) =>
  existsSync(path) ? parseEnvironment(readFileSync(path, 'utf8')) : {};

const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;

const gitPath = (argument) =>
  execFileSync('git', ['rev-parse', '--path-format=absolute', argument], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();

const isPrimaryWorktree = resolve(gitPath('--git-dir')) === resolve(gitPath('--git-common-dir'));
const worktreeId = createHash('sha256').update(realpathSync(rootDir)).digest('hex').slice(0, 10);
const composeProject = isPrimaryWorktree ? 'playstead' : `playstead-wt-${worktreeId}`;
const tmuxSession = isPrimaryWorktree ? 'playstead-dev' : `playstead-wt-${worktreeId}`;
const localEnvironment = readEnvironment(resolve(rootDir, '.env'));
const previousRuntime = readEnvironment(runtimeFile);
const reuseRuntime = previousRuntime.PLAYSTEAD_COMPOSE_PROJECT === composeProject;

const canBind = (port) =>
  new Promise((resolvePromise) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolvePromise(false));
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolvePromise(true));
    });
  });

const choosePort = async (name, preferred, reserved) => {
  if (reuseRuntime) {
    const saved = Number(previousRuntime[name]);
    if (Number.isInteger(saved) && saved > 0 && saved < 65_536) {
      reserved.add(saved);
      return saved;
    }
  }

  for (let candidate = preferred; candidate < Math.min(preferred + 2_000, 65_536); candidate += 1) {
    if (!reserved.has(candidate) && (await canBind(candidate))) {
      reserved.add(candidate);
      return candidate;
    }
  }

  throw new Error(`[playstead] no available port found for ${name}`);
};

const offset = Number.parseInt(worktreeId.slice(0, 6), 16) % 4_000;
const preferredPorts = isPrimaryWorktree
  ? { frontend: 5_174, backend: 3_005, database: 55_432, redis: 56_379 }
  : {
      frontend: 20_000 + offset,
      backend: 26_000 + offset,
      database: 32_000 + offset,
      redis: 38_000 + offset,
    };
const reserved = new Set();
const frontendPort = await choosePort('PLAYSTEAD_FRONTEND_PORT', preferredPorts.frontend, reserved);
const backendPort = await choosePort('PLAYSTEAD_BACKEND_PORT', preferredPorts.backend, reserved);
const databasePort = await choosePort('PLAYSTEAD_DB_PORT', preferredPorts.database, reserved);
const redisPort = await choosePort('PLAYSTEAD_REDIS_PORT', preferredPorts.redis, reserved);

const postgresUser = localEnvironment.POSTGRES_USER || previousRuntime.POSTGRES_USER || 'playstead';
const postgresDatabase = localEnvironment.POSTGRES_DB || previousRuntime.POSTGRES_DB || 'playstead';
const postgresPassword =
  localEnvironment.POSTGRES_PASSWORD ||
  previousRuntime.POSTGRES_PASSWORD ||
  randomBytes(24).toString('hex');
const configuredJwt = localEnvironment.JWT_SECRET || previousRuntime.JWT_SECRET || '';
const jwtSecret = configuredJwt.length >= 32 ? configuredJwt : randomBytes(32).toString('hex');
const backendUrl = `http://localhost:${backendPort}`;
const frontendUrl = `http://localhost:${frontendPort}`;
const encodedUser = encodeURIComponent(postgresUser);
const encodedPassword = encodeURIComponent(postgresPassword);
const encodedDatabase = encodeURIComponent(postgresDatabase);

const runtime = {
  PLAYSTEAD_COMPOSE_PROJECT: composeProject,
  PLAYSTEAD_TMUX_SESSION: tmuxSession,
  PLAYSTEAD_FRONTEND_PORT: String(frontendPort),
  PLAYSTEAD_BACKEND_PORT: String(backendPort),
  PLAYSTEAD_DB_PORT: String(databasePort),
  PLAYSTEAD_REDIS_PORT: String(redisPort),
  PLAYSTEAD_FRONTEND_URL: frontendUrl,
  PLAYSTEAD_BACKEND_URL: backendUrl,
  NODE_ENV: 'development',
  PORT: String(backendPort),
  APP_ORIGIN: frontendUrl,
  POSTGRES_USER: postgresUser,
  POSTGRES_DB: postgresDatabase,
  POSTGRES_PASSWORD: postgresPassword,
  JWT_SECRET: jwtSecret,
  DATABASE_URL: `postgresql://${encodedUser}:${encodedPassword}@localhost:${databasePort}/${encodedDatabase}`,
  REDIS_URL: `redis://localhost:${redisPort}`,
  DAILY_TIME_ZONE: localEnvironment.DAILY_TIME_ZONE || 'UTC',
  MATCH_ROUND_SECONDS: localEnvironment.MATCH_ROUND_SECONDS || '45',
  MATCH_REVEAL_SECONDS: localEnvironment.MATCH_REVEAL_SECONDS || '8',
  VITE_API_URL: '',
  VITE_SOCKET_URL: '',
};

for (const key of [
  'VITE_SATELLITE_TILE_URL',
  'VITE_SATELLITE_TILE_ATTRIBUTION',
  'VITE_SATELLITE_TILE_MAX_ZOOM',
]) {
  if (localEnvironment[key]) runtime[key] = localEnvironment[key];
}

mkdirSync(stateDir, { recursive: true, mode: 0o700 });
const temporaryFile = `${runtimeFile}.tmp`;
const serialized = `${Object.entries(runtime)
  .map(([key, value]) => `${key}=${shellQuote(value)}`)
  .join('\n')}\n`;
writeFileSync(temporaryFile, serialized, { encoding: 'utf8', mode: 0o600 });
renameSync(temporaryFile, runtimeFile);
chmodSync(runtimeFile, 0o600);

process.stdout.write(`[playstead] compose project: ${composeProject}\n`);
process.stdout.write(`[playstead] frontend: ${frontendUrl}\n`);
process.stdout.write(`[playstead] backend: ${backendUrl}\n`);
process.stdout.write(`[playstead] runtime: ${runtimeFile}\n`);
