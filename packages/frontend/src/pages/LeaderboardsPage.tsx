import { useEffect, useState } from 'react';
import { FiAward, FiCalendar, FiRefreshCw, FiTrendingUp, FiUsers } from 'react-icons/fi';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  LoadingState,
  Pill,
  SegmentedControl,
} from '../components/ui';
import { apiRequest, readableError } from '../lib/api';
import { formatScore } from '../lib/format';
import { leaderboardPath, type LeaderboardKind } from '../lib/leaderboards';
import { useAuthStore } from '../store/authStore';
import type { LeaderboardEntry, LeaderboardResponse } from '../types';

type BoardKind = LeaderboardKind;

const labels: Record<BoardKind, { eyebrow: string; title: string; copy: string }> = {
  daily: {
    eyebrow: 'Today’s expedition',
    title: 'Daily trailblazers',
    copy: 'Everyone played the same five places. Fresh tracks appear each day.',
  },
  'all-time': {
    eyebrow: 'Across all expeditions',
    title: 'All-time explorers',
    copy: 'The strongest Atlas Drop totals ever recorded on this Playstead.',
  },
  multiplayer: {
    eyebrow: 'Around live tables',
    title: 'Together at the top',
    copy: 'Scores earned while guessing live with friends and neighbours.',
  },
};

export function LeaderboardsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [kind, setKind] = useState<BoardKind>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<LeaderboardResponse>(leaderboardPath(kind, 50), { token })
      .then((response) => active && setEntries(response.entries))
      .catch((reason) => active && setError(readableError(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind, reload, token]);

  const boardCopy = labels[kind];
  const podium = entries.slice(0, 3);

  return (
    <div className="page leaderboard-page">
      <header className="page-heading leaderboard-heading">
        <div>
          <Eyebrow>{boardCopy.eyebrow}</Eyebrow>
          <h1>{boardCopy.title}</h1>
          <p>{boardCopy.copy}</p>
        </div>
        <SegmentedControl
          label="Leaderboard period"
          value={kind}
          onChange={setKind}
          segments={[
            { value: 'daily', label: 'Daily' },
            { value: 'all-time', label: 'All time' },
            { value: 'multiplayer', label: 'Live tables' },
          ]}
        />
      </header>

      {loading ? (
        <LoadingState label="Reading the scorebook…" />
      ) : error ? (
        <Card className="load-error-card">
          <ErrorBanner message={error} />
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
            <FiRefreshCw aria-hidden="true" /> Try again
          </Button>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            title="No scores yet"
            copy="The first completed game will open this leaderboard."
          />
        </Card>
      ) : (
        <>
          <section className="podium" aria-label="Top three players">
            {[1, 0, 2].map((sourceIndex) => {
              const entry = podium[sourceIndex];
              if (!entry) return null;
              return (
                <article
                  className={`podium-place podium-place--${sourceIndex + 1}`}
                  key={entry.user.id}
                >
                  <span className="podium-place__rank">
                    <FiAward aria-hidden="true" /> {entry.rank}
                  </span>
                  <span className="avatar avatar--large">
                    {entry.user.handle.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{entry.user.handle}</strong>
                  <span>{formatScore(entry.score)}</span>
                  <small>
                    {entry.gamesPlayed} {entry.gamesPlayed === 1 ? 'game' : 'games'}
                  </small>
                </article>
              );
            })}
          </section>

          <Card className="leaderboard-table-card">
            <div className="leaderboard-table-title">
              <h2>Full scorebook</h2>
              <Pill tone="neutral">
                {kind === 'daily' ? (
                  <FiCalendar aria-hidden="true" />
                ) : kind === 'multiplayer' ? (
                  <FiUsers aria-hidden="true" />
                ) : (
                  <FiTrendingUp aria-hidden="true" />
                )}
                {entries.length} explorers
              </Pill>
            </div>
            <div className="table-scroll">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Explorer</th>
                    <th>Games</th>
                    <th>Best score</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.user.id}
                      className={entry.user.id === user?.id ? 'is-you' : undefined}
                    >
                      <td>
                        <span className="table-rank">{entry.rank}</span>
                      </td>
                      <td>
                        <span className="player-cell">
                          <span className="avatar avatar--small">
                            {entry.user.handle.slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{entry.user.handle}</strong>
                          {entry.user.id === user?.id ? <Pill tone="success">You</Pill> : null}
                        </span>
                      </td>
                      <td>{entry.gamesPlayed}</td>
                      <td>
                        <strong>{formatScore(entry.score)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
