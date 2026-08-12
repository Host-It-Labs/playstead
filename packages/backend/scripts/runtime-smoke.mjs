/* global fetch, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { io } from 'socket.io-client';

const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:18080';
const apiBase = `${origin}/api`;
const timeoutMs = 20_000;

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
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

async function expectStatus(path, expectedStatus, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expectedStatus, `${method} ${path} returned ${response.status}`);
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(origin, { path: '/socket.io', auth: { token }, transports: ['websocket'] });
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), timeoutMs);
    socket.once('connect_error', reject);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
  });
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (error, ack) => {
      if (error) return reject(error);
      if (!ack?.ok) return reject(new Error(`${event}: ${JSON.stringify(ack?.error)}`));
      resolve(ack.data);
    });
  });
}

function waitForMatch(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('match:update', listener);
      reject(new Error('Timed out waiting for match update'));
    }, timeoutMs);
    const listener = (snapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timer);
      socket.off('match:update', listener);
      resolve(snapshot);
    };
    socket.on('match:update', listener);
  });
}

function waitForEvent(socket, event, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const listener = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    };
    socket.on(event, listener);
  });
}

const password = 'tabletop-passphrase';
const aliceAuth = await request('/auth/register', {
  method: 'POST',
  body: { handle: 'AliceSmoke', password },
});
const bobAuth = await request('/auth/register', {
  method: 'POST',
  body: { handle: 'BobSmoke', password },
});
assert.equal((await request('/auth/me', { token: aliceAuth.token })).user.id, aliceAuth.user.id);

let daily = (
  await request('/games/atlas-drop/daily/start', { token: aliceAuth.token, method: 'POST' })
).session;
let bobDaily = (
  await request('/games/atlas-drop/daily/start', { token: bobAuth.token, method: 'POST' })
).session;
assert.equal(daily.results.length, 0);
assert.equal('lat' in daily.target, false, 'Daily target leaked coordinates');
assert.equal(bobDaily.target.prompt, daily.target.prompt, 'Daily prompt differed between players');
for (let round = 1; round <= 5; round += 1) {
  const response = await request(`/games/atlas-drop/daily/${daily.id}/guess`, {
    token: aliceAuth.token,
    method: 'POST',
    body: { lat: round * 3, lng: round * -7 },
  });
  daily = response.session;
  const bobResponse = await request(`/games/atlas-drop/daily/${bobDaily.id}/guess`, {
    token: bobAuth.token,
    method: 'POST',
    body: { lat: round * -4, lng: round * 8 },
  });
  bobDaily = bobResponse.session;
  assert.equal(response.lastReveal.round, round);
  assert.equal(typeof response.lastReveal.target.lat, 'number');
  assert.equal(
    bobResponse.lastReveal.target.id,
    response.lastReveal.target.id,
    `Daily target differed between players in round ${round}`,
  );
}
assert.equal(daily.status, 'completed');
assert.equal(daily.results.length, 5);
assert.deepEqual(
  bobDaily.results.map((result) => result.target.id),
  daily.results.map((result) => result.target.id),
  'Daily five-target sequence differed between players',
);
const resumed = (
  await request('/games/atlas-drop/daily/start', { token: aliceAuth.token, method: 'POST' })
).session;
assert.equal(resumed.id, daily.id, 'Daily session was not durable/resumable');
const dailyBoard = await request(`/leaderboards/daily?date=${daily.date}`, {
  token: aliceAuth.token,
});
assert.equal(dailyBoard.entries.length, 2);
assert.equal(
  (await request('/leaderboards/all-time', { token: aliceAuth.token })).entries.length,
  2,
);

const aliceSocket = await connect(aliceAuth.token);
const bobSocket = await connect(bobAuth.token);
try {
  const aliceRooms = await request('/chat/rooms', { token: aliceAuth.token });
  const commons = aliceRooms.rooms.find((room) => room.kind === 'commons');
  assert.ok(commons);
  await emit(aliceSocket, 'chat:subscribe', { roomId: commons.id });
  await emit(bobSocket, 'chat:subscribe', { roomId: commons.id });
  const commonsMessage = waitForEvent(
    bobSocket,
    'chat:message',
    (message) => message.body === 'Hello Commons',
  );
  const sentCommons = await emit(aliceSocket, 'chat:send', {
    roomId: commons.id,
    body: 'Hello Commons',
    clientNonce: randomUUID(),
  });
  assert.equal((await commonsMessage).id, sentCommons.id);

  const circle = (
    await request('/chat/rooms', {
      token: aliceAuth.token,
      method: 'POST',
      body: { name: 'Smoke Circle' },
    })
  ).room;
  assert.equal(
    (await request('/chat/rooms', { token: bobAuth.token })).rooms.some(
      (room) => room.id === circle.id,
    ),
    false,
  );
  await expectStatus(`/chat/rooms/${circle.id}/messages`, 403, { token: bobAuth.token });
  await assert.rejects(() => emit(bobSocket, 'chat:subscribe', { roomId: circle.id }));
  const joined = (
    await request('/chat/rooms/join', {
      token: bobAuth.token,
      method: 'POST',
      body: { inviteCode: circle.inviteCode },
    })
  ).room;
  assert.equal(joined.id, circle.id);
  await emit(aliceSocket, 'chat:subscribe', { roomId: circle.id });
  await emit(bobSocket, 'chat:subscribe', { roomId: circle.id });
  const circleMessage = waitForEvent(
    aliceSocket,
    'chat:message',
    (message) => message.body === 'Circle joined',
  );
  await emit(bobSocket, 'chat:send', {
    roomId: circle.id,
    body: 'Circle joined',
    clientNonce: randomUUID(),
  });
  assert.equal((await circleMessage).user.id, bobAuth.user.id);
  assert.equal(
    (await request(`/chat/rooms/${circle.id}/messages`, { token: aliceAuth.token })).messages
      .length,
    1,
  );

  const publicMatch = (
    await request('/matches', {
      token: bobAuth.token,
      method: 'POST',
      body: { visibility: 'public' },
    })
  ).match;
  const publicTables = await request('/matches/public', { token: aliceAuth.token });
  const publicSummary = publicTables.matches.find((table) => table.id === publicMatch.id);
  assert.equal(publicSummary.playerCount, 1);
  assert.equal(publicSummary.host.id, bobAuth.user.id);
  assert.equal('target' in publicSummary, false, 'Public discovery leaked target data');

  let match = (
    await request('/matches', {
      token: aliceAuth.token,
      method: 'POST',
      body: { visibility: 'private' },
    })
  ).match;
  await expectStatus(`/matches/${match.id}`, 403, { token: bobAuth.token });
  assert.equal('lat' in (match.target ?? {}), false);
  match = (
    await request('/matches/join', {
      token: bobAuth.token,
      method: 'POST',
      body: { code: match.code },
    })
  ).match;
  await emit(aliceSocket, 'match:subscribe', { matchId: match.id });
  await emit(bobSocket, 'match:subscribe', { matchId: match.id });
  await emit(bobSocket, 'match:ready', { matchId: match.id, ready: true });
  match = await emit(aliceSocket, 'match:start', { matchId: match.id });
  assert.equal(match.state, 'round_open');
  assert.equal('lat' in match.target, false, 'Live target leaked coordinates while open');
  const resumedMatch = (
    await request('/matches/join', {
      token: bobAuth.token,
      method: 'POST',
      body: { code: match.code },
    })
  ).match;
  assert.equal(resumedMatch.id, match.id, 'Existing player could not resume a started table');

  for (let round = 1; round <= 5; round += 1) {
    const priorScore = match.players.find(
      (player) => player.userId === aliceAuth.user.id,
    ).totalScore;
    const afterAlice = await emit(aliceSocket, 'match:guess', {
      matchId: match.id,
      lat: round,
      lng: round,
    });
    const hiddenAlice = afterAlice.players.find((player) => player.userId === aliceAuth.user.id);
    assert.equal(hiddenAlice.roundScore, null, 'Open round leaked a submitted round score');
    assert.equal(hiddenAlice.totalScore, priorScore, 'Open round leaked an updated total score');
    const nextState = round === 5 ? 'finished' : 'round_open';
    const nextStatePromise = waitForMatch(
      aliceSocket,
      (snapshot) => snapshot.state === nextState && (round === 5 || snapshot.round === round + 1),
    );
    const reveal = await emit(bobSocket, 'match:guess', {
      matchId: match.id,
      lat: -round,
      lng: -round,
    });
    assert.equal(reveal.state, 'round_reveal');
    assert.equal(reveal.round, round);
    assert.equal(typeof reveal.target.lat, 'number');
    match = await nextStatePromise;
    if (round < 5) {
      assert.equal(match.round, round + 1);
      assert.equal('lat' in match.target, false, 'Next live target leaked coordinates');
    }
  }
  assert.equal(match.players.length, 2);
  assert.equal(match.finishedAt !== null, true);
  const multiplayerBoard = await request('/leaderboards/multiplayer', { token: aliceAuth.token });
  assert.equal(multiplayerBoard.entries.length, 2);

  process.stdout.write(
    JSON.stringify({
      ok: true,
      dailyScore: daily.totalScore,
      commonsMessageId: sentCommons.id,
      circleId: circle.id,
      matchId: match.id,
      matchScores: match.players.map(({ handle, totalScore }) => ({ handle, totalScore })),
    }) + '\n',
  );
} finally {
  aliceSocket.close();
  bobSocket.close();
}
