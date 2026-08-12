/* global fetch */
import assert from 'node:assert/strict';
import process from 'node:process';

const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:18080';
const matchId = process.env.SMOKE_MATCH_ID;
if (!matchId) throw new Error('SMOKE_MATCH_ID is required');

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

const password = 'tabletop-passphrase';
const alice = await request('/auth/login', {
  method: 'POST',
  body: { handle: 'AliceSmoke', password },
});
const bob = await request('/auth/login', {
  method: 'POST',
  body: { handle: 'BobSmoke', password },
});

const [aliceDaily, bobDaily] = await Promise.all([
  request('/games/atlas-drop/daily/start', { token: alice.token, method: 'POST' }),
  request('/games/atlas-drop/daily/start', { token: bob.token, method: 'POST' }),
]);
assert.equal(aliceDaily.session.status, 'completed');
assert.equal(bobDaily.session.status, 'completed');
assert.deepEqual(
  aliceDaily.session.results.map((result) => result.target.id),
  bobDaily.session.results.map((result) => result.target.id),
);

const rooms = await request('/chat/rooms', { token: alice.token });
const circle = rooms.rooms.find((room) => room.name === 'Smoke Circle');
assert.ok(circle, 'Persisted circle was not found');
const history = await request(`/chat/rooms/${circle.id}/messages`, { token: alice.token });
assert.equal(
  history.messages.some((message) => message.body === 'Circle joined'),
  true,
);

const match = (await request(`/matches/${matchId}`, { token: alice.token })).match;
assert.equal(match.state, 'finished');
assert.equal(match.players.length, 2);
const resumed = (
  await request('/matches/join', {
    token: bob.token,
    method: 'POST',
    body: { code: match.code },
  })
).match;
assert.equal(resumed.id, match.id);

process.stdout.write(
  JSON.stringify({
    ok: true,
    dailySessionId: aliceDaily.session.id,
    circleId: circle.id,
    matchId: match.id,
    matchState: match.state,
  }) + '\n',
);
