import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiCopy,
  FiEye,
  FiLock,
  FiMapPin,
  FiPlay,
  FiRadio,
  FiRefreshCw,
  FiUsers,
} from 'react-icons/fi';
import type { Socket } from 'socket.io-client';
import { GameMap } from '../components/GameMap';
import {
  Button,
  Card,
  ErrorBanner,
  Eyebrow,
  Field,
  Pill,
  SegmentedControl,
} from '../components/ui';
import { ApiError, apiRequest, readableError } from '../lib/api';
import { formatClock, formatScore } from '../lib/format';
import {
  clearCurrentMatchId,
  readCurrentMatchId,
  saveCurrentMatchId,
  shouldResetMatchGuess,
  subscribeToMatch,
} from '../lib/matches';
import { emitWithAck, getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import type {
  AtlasRevealedTarget,
  Coordinates,
  MatchSnapshot,
  MatchVisibility,
  PublicMatchesResponse,
  PublicMatchSummary,
} from '../types';

type MatchResponse = { match: MatchSnapshot };

function isRevealed(
  snapshot: MatchSnapshot,
): snapshot is MatchSnapshot & { target: AtlasRevealedTarget } {
  return Boolean(snapshot.target && 'lat' in snapshot.target && 'lng' in snapshot.target);
}

function LiveMatch({ initial, onLeave }: { initial: MatchSnapshot; onLeave: () => void }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [match, setMatch] = useState(initial);
  const [draft, setDraft] = useState<Coordinates | null>(null);
  const [submittedGuess, setSubmittedGuess] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const previousPhaseRef = useRef({ state: match.state, round: match.round });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const socket = getSocket(token);
    socketRef.current = socket;
    const update = (snapshot: MatchSnapshot) => {
      if (snapshot.id !== initial.id) return;
      setMatch(snapshot);
      if (shouldResetMatchGuess(previousPhaseRef.current, snapshot)) {
        setDraft(null);
        setSubmittedGuess(null);
      }
      previousPhaseRef.current = { state: snapshot.state, round: snapshot.round };
    };
    const subscribe = () => {
      setConnected(false);
      void subscribeToMatch(socket, initial.id)
        .then((snapshot) => {
          if (!active) return;
          update(snapshot);
          setConnected(true);
          setError(null);
        })
        .catch((reason) => {
          if (active) setError(readableError(reason));
        });
    };
    const disconnect = () => setConnected(false);
    socket.on('connect', subscribe);
    socket.on('disconnect', disconnect);
    socket.on('match:update', update);
    if (socket.connected) subscribe();
    return () => {
      active = false;
      socket.off('connect', subscribe);
      socket.off('disconnect', disconnect);
      socket.off('match:update', update);
    };
  }, [initial.id, token]);

  const send = async (event: string, payload: Record<string, unknown>): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;
    setBusy(true);
    setError(null);
    try {
      await emitWithAck(socket, event, { matchId: match.id, ...payload });
      return true;
    } catch (reason) {
      setError(readableError(reason));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitGuess = async () => {
    if (!draft) return;
    if (await send('match:guess', draft)) setSubmittedGuess(draft);
  };

  const me = match.players.find((player) => player.userId === user?.id);
  const isHost = match.hostUserId === user?.id;
  const canStart =
    isHost &&
    match.players.length >= 1 &&
    match.players.every((player) => player.ready || player.isHost);
  const answer = isRevealed(match) ? { lat: match.target.lat, lng: match.target.lng } : null;
  const sortedPlayers = [...match.players].sort((a, b) => b.totalScore - a.totalScore);

  const copyCode = async () => {
    await navigator.clipboard.writeText(match.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (match.state === 'lobby') {
    return (
      <div className="live-room-page page">
        <header className="live-room-topbar">
          <button className="back-button" type="button" onClick={onLeave}>
            <FiArrowLeft aria-hidden="true" /> Leave table
          </button>
          <Pill tone={connected ? 'live' : 'neutral'}>
            <span className="presence-dot" /> {connected ? 'Connected' : 'Reconnecting'}
          </Pill>
        </header>
        <div className="lobby-layout">
          <Card className="lobby-code-card">
            <span className="lobby-code-card__icon">
              <FiUsers aria-hidden="true" />
            </span>
            <Eyebrow>Live table</Eyebrow>
            <h1>Bring your explorers in</h1>
            <p>Share this table code. Everyone can ready up once they arrive.</p>
            <button className="table-code" type="button" onClick={() => void copyCode()}>
              <span>{match.code}</span>
              {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
              <small>{copied ? 'Copied' : 'Copy code'}</small>
            </button>
            <div className="lobby-settings">
              <span>
                {match.visibility === 'private' ? <FiLock /> : <FiEye />} {match.visibility} table
              </span>
              <span>5 rounds</span>
            </div>
          </Card>
          <Card className="lobby-players-card">
            <header className="card-header">
              <div>
                <Eyebrow>At the table</Eyebrow>
                <h2>{match.players.length} players</h2>
              </div>
            </header>
            <ul className="lobby-player-list">
              {match.players.map((player) => (
                <li key={player.userId}>
                  <span className="avatar">{player.handle.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{player.handle}</strong>
                    <small>
                      {player.isHost ? 'Host' : player.ready ? 'Ready to go' : 'Getting settled'}
                    </small>
                  </span>
                  {player.isHost ? (
                    <span className="host-crown" aria-label="Host">
                      ♛
                    </span>
                  ) : (
                    <Pill tone={player.ready ? 'success' : 'neutral'}>
                      {player.ready ? 'Ready' : 'Waiting'}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
            {error ? <ErrorBanner message={error} /> : null}
            {!isHost ? (
              <Button
                size="lg"
                variant={me?.ready ? 'secondary' : 'primary'}
                loading={busy}
                onClick={() => void send('match:ready', { ready: !me?.ready })}
              >
                <FiCheck aria-hidden="true" /> {me?.ready ? 'I’m not ready' : 'I’m ready'}
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={!canStart}
                loading={busy}
                onClick={() => void send('match:start', {})}
              >
                <FiPlay aria-hidden="true" /> Start Atlas Drop
              </Button>
            )}
            {isHost && !canStart ? (
              <p className="confirm-note">Everyone must be ready before the expedition begins.</p>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page live-game-page">
      <header className="game-topbar">
        <button className="back-button" type="button" onClick={onLeave}>
          <FiArrowLeft aria-hidden="true" /> <span>Leave</span>
        </button>
        <div className="game-title">
          <span className="game-title__mark">
            <FiRadio />
          </span>
          <span>
            <small>Live table · {match.code}</small>
            <strong>Atlas Drop</strong>
          </span>
        </div>
        <Pill tone="live">
          <span className="presence-dot" /> {match.players.length} playing
        </Pill>
        <div className="round-clock">
          <small>{match.state === 'round_reveal' ? 'Next round' : 'Drop closes'}</small>
          <strong>
            {formatClock(
              match.state === 'round_reveal' ? match.revealEndsAt : match.deadlineAt,
              now,
            )}
          </strong>
        </div>
      </header>
      <div className="game-layout">
        <GameMap
          draft={draft}
          guess={submittedGuess}
          answer={answer}
          interactive={match.state === 'round_open' && !submittedGuess}
          onDraftChange={setDraft}
        />
        <aside className="game-rail live-game-rail">
          {match.state === 'finished' ? (
            <div className="live-finish">
              <span className="summary-seal" aria-hidden="true">
                ♛
              </span>
              <Eyebrow>Table complete</Eyebrow>
              <h2>What a journey</h2>
              <ol className="live-standing-list">
                {sortedPlayers.map((player, index) => (
                  <li key={player.userId}>
                    <span>{index + 1}</span>
                    <strong>{player.handle}</strong>
                    <b>{formatScore(player.totalScore)}</b>
                  </li>
                ))}
              </ol>
              <Button variant="secondary" onClick={onLeave}>
                Back to tables
              </Button>
            </div>
          ) : match.state === 'round_reveal' && isRevealed(match) ? (
            <div className="reveal-panel">
              <div className="reveal-panel__stamp">
                <FiMapPin /> Answer revealed
              </div>
              <div>
                <Eyebrow>Round {match.round}</Eyebrow>
                <h2>{match.target.name}</h2>
              </div>
              <p className="reveal-story">{match.target.story}</p>
              <div className="mini-standings">
                <h3>Round scores</h3>
                {sortedPlayers.map((player) => (
                  <div key={player.userId}>
                    <span>{player.handle}</span>
                    <strong>+{formatScore(player.roundScore ?? 0)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="prompt-panel">
              <div className="prompt-panel__top">
                <Pill>
                  Round {match.round} of {match.totalRounds}
                </Pill>
                {match.target && match.target.multiplier > 1 ? (
                  <Pill tone="coral">×{match.target.multiplier}</Pill>
                ) : null}
              </div>
              <div className="prompt-kind">
                <FiMapPin /> {match.target?.kind ?? 'place'}
              </div>
              <h1>{match.target?.prompt ?? 'Waiting for the next place…'}</h1>
              <div className={draft ? 'pin-status pin-status--ready' : 'pin-status'}>
                <span className="pin-status__icon">
                  <FiMapPin />
                </span>
                <span>
                  <strong>
                    {submittedGuess ? 'Guess locked' : draft ? 'Pin ready' : 'Choose your drop'}
                  </strong>
                  <small>
                    {submittedGuess
                      ? 'Waiting for other explorers…'
                      : draft
                        ? `${draft.lat.toFixed(2)}°, ${draft.lng.toFixed(2)}°`
                        : 'Tap anywhere on the map.'}
                  </small>
                </span>
              </div>
              {error ? <ErrorBanner message={error} /> : null}
              <Button
                size="lg"
                disabled={!draft || Boolean(submittedGuess)}
                loading={busy}
                onClick={() => void submitGuess()}
              >
                <FiMapPin /> {submittedGuess ? 'Drop confirmed' : 'Confirm drop'}
              </Button>
              <div className="live-player-progress">
                {match.players.map((player) => (
                  <span
                    key={player.userId}
                    className={player.hasGuessed ? 'has-guessed' : ''}
                    title={`${player.handle}: ${player.hasGuessed ? 'guessed' : 'choosing'}`}
                  >
                    <span className="avatar avatar--small">
                      {player.handle.slice(0, 2).toUpperCase()}
                    </span>
                    <small>{player.hasGuessed ? '✓' : '…'}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function LiveTablesPage() {
  const token = useAuthStore((state) => state.token);
  const [visibility, setVisibility] = useState<MatchVisibility>('private');
  const [joinCode, setJoinCode] = useState('');
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [publicMatches, setPublicMatches] = useState<PublicMatchSummary[]>([]);
  const [busy, setBusy] = useState<'create' | 'join' | 'restore' | null>('restore');
  const [publicLoading, setPublicLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enterMatch = (snapshot: MatchSnapshot) => {
    saveCurrentMatchId(window.localStorage, snapshot.id);
    setMatch(snapshot);
  };

  const leaveMatch = () => {
    clearCurrentMatchId(window.localStorage);
    setMatch(null);
  };

  const loadPublicMatches = useCallback(async () => {
    if (!token) return;
    setPublicLoading(true);
    try {
      const response = await apiRequest<PublicMatchesResponse>('/matches/public', { token });
      setPublicMatches(response.matches);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setPublicLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const matchId = readCurrentMatchId(window.localStorage);
    if (!matchId) {
      setBusy(null);
      return;
    }

    let active = true;
    void apiRequest<MatchResponse>(`/matches/${encodeURIComponent(matchId)}`, { token })
      .then((response) => {
        if (active) enterMatch(response.match);
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 404) {
          clearCurrentMatchId(window.localStorage);
        } else {
          setError(readableError(reason));
        }
      })
      .finally(() => {
        if (active) setBusy(null);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    void loadPublicMatches();
  }, [loadPublicMatches]);

  const create = async () => {
    if (!token) return;
    setBusy('create');
    setError(null);
    try {
      const response = await apiRequest<MatchResponse>('/matches', {
        method: 'POST',
        token,
        body: { visibility },
      });
      enterMatch(response.match);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };

  const joinCodeMatch = async (code: string) => {
    if (!token) return;
    setBusy('join');
    setError(null);
    try {
      const response = await apiRequest<MatchResponse>('/matches/join', {
        method: 'POST',
        token,
        body: { code },
      });
      enterMatch(response.match);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(null);
    }
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    void joinCodeMatch(joinCode);
  };

  if (match) return <LiveMatch initial={match} onLeave={leaveMatch} />;

  if (busy === 'restore') {
    return (
      <div className="game-loading-page">
        <p>Finding your live table…</p>
      </div>
    );
  }

  return (
    <div className="page live-page">
      <header className="page-heading live-heading">
        <div>
          <Eyebrow>Same map, same moment</Eyebrow>
          <h1>Live tables</h1>
          <p>Gather your people, open a table, and drop every pin together.</p>
        </div>
        <Pill tone="live">
          <FiRadio /> Synchronous play
        </Pill>
      </header>
      {error ? <ErrorBanner message={error} /> : null}
      <section className="table-entry-grid">
        <Card className="create-table-card">
          <span className="table-entry-icon">
            <FiUsers />
          </span>
          <Eyebrow>Host a game</Eyebrow>
          <h2>Set a new table</h2>
          <p>You control when the five-round expedition starts.</p>
          <SegmentedControl
            label="Table visibility"
            value={visibility}
            onChange={setVisibility}
            segments={[
              { value: 'private', label: 'Private' },
              { value: 'public', label: 'Public' },
            ]}
          />
          <div className="visibility-explainer">
            {visibility === 'private' ? <FiLock /> : <FiEye />}
            <span>
              <strong>{visibility === 'private' ? 'Code only' : 'Open table'}</strong>
              <small>
                {visibility === 'private'
                  ? 'Only people with your code can join.'
                  : 'Anyone on this Playstead may join.'}
              </small>
            </span>
          </div>
          <Button size="lg" loading={busy === 'create'} onClick={() => void create()}>
            <FiPlusIcon /> Create table
          </Button>
        </Card>
        <Card className="join-table-card">
          <span className="table-entry-icon table-entry-icon--sky">
            <FiMapPin />
          </span>
          <Eyebrow>Got a code?</Eyebrow>
          <h2>Join a table</h2>
          <p>Enter the code your host shared with you.</p>
          <form onSubmit={join}>
            <Field
              label="Table code"
              value={joinCode}
              minLength={6}
              maxLength={10}
              required
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="MAPLE7"
            />
            <Button size="lg" variant="secondary" type="submit" loading={busy === 'join'}>
              Join table
            </Button>
          </form>
        </Card>
      </section>
      <Card className="public-tables-card">
        <header className="card-header">
          <div>
            <Eyebrow>Open tables</Eyebrow>
            <h2>Join the Commons</h2>
          </div>
          <Button
            aria-label="Refresh public tables"
            title="Refresh public tables"
            variant="quiet"
            size="sm"
            loading={publicLoading}
            onClick={() => void loadPublicMatches()}
          >
            <FiRefreshCw aria-hidden="true" /> Refresh
          </Button>
        </header>
        {publicLoading && publicMatches.length === 0 ? (
          <p className="public-tables-status">Looking for open tables…</p>
        ) : publicMatches.length === 0 ? (
          <p className="public-tables-status">No public tables are waiting right now.</p>
        ) : (
          <ul className="public-table-list">
            {publicMatches.map((table) => (
              <li key={table.id}>
                <span className="avatar">{table.host.handle.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{table.host.handle}’s table</strong>
                  <small>
                    {table.playerCount} {table.playerCount === 1 ? 'explorer' : 'explorers'} waiting
                  </small>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busy === 'join'}
                  onClick={() => void joinCodeMatch(table.code)}
                >
                  Join table
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="live-how">
        <Eyebrow>How a live table works</Eyebrow>
        <div>
          <span>
            <b>1</b>
            <strong>Gather</strong>
            <small>Share one simple code.</small>
          </span>
          <span>
            <b>2</b>
            <strong>Drop</strong>
            <small>Everyone guesses together.</small>
          </span>
          <span>
            <b>3</b>
            <strong>Reveal</strong>
            <small>Compare the trail after each round.</small>
          </span>
        </div>
      </Card>
    </div>
  );
}

function FiPlusIcon() {
  return <span aria-hidden="true">＋</span>;
}
