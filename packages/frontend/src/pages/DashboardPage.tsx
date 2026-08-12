import { useEffect, useState } from 'react';
import { FiArrowRight, FiCompass, FiMessageCircle, FiRadio, FiUsers } from 'react-icons/fi';
import { apiRequest, readableError, unwrap } from '../lib/api';
import { firstArray, formatScore } from '../lib/format';
import { leaderboardPath } from '../lib/leaderboards';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import type { LeaderboardEntry, LeaderboardResponse } from '../types';
import { Button, Card, EmptyState, ErrorBanner, Eyebrow, Pill } from '../components/ui';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const setView = useAppStore((state) => state.setView);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<LeaderboardResponse | LeaderboardEntry[] | { data: LeaderboardResponse }>(
      leaderboardPath('daily', 5),
      { token },
    )
      .then((response) => {
        if (!active) return;
        const value = unwrap(response);
        setLeaders(firstArray<LeaderboardEntry>(value, 'entries', 'items'));
      })
      .catch((reason) => active && setError(readableError(reason)));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <Eyebrow>{greeting()}</Eyebrow>
          <h1>{user?.handle}, where to?</h1>
          <p>The table is set. Start today’s expedition or see who is around.</p>
        </div>
        <Pill tone="live">
          <span className="presence-dot" /> Instance online
        </Pill>
      </header>

      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <Pill tone="coral">
            <FiCompass aria-hidden="true" /> Today’s expedition
          </Pill>
          <div>
            <h2>Atlas Drop</h2>
            <p>Five places. One shared map. How close can your hunches get you?</p>
          </div>
          <div className="dashboard-hero__meta">
            <span>
              <strong>5</strong> rounds
            </span>
            <span>
              <strong>~4</strong> minutes
            </span>
            <span>
              <strong>24h</strong> to play
            </span>
          </div>
          <Button size="lg" onClick={() => setView('daily')}>
            Start expedition <FiArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="dashboard-hero__art" aria-hidden="true">
          <span className="hero-globe">
            <span className="hero-globe__grid" />
            <span className="hero-globe__land hero-globe__land--one" />
            <span className="hero-globe__land hero-globe__land--two" />
            <span className="hero-globe__pin" />
          </span>
          <span className="hero-orbit hero-orbit--one" />
          <span className="hero-orbit hero-orbit--two" />
        </div>
      </section>

      <section className="dashboard-grid">
        <Card className="dashboard-card leaderboard-peek">
          <header className="card-header">
            <div>
              <Eyebrow>Today</Eyebrow>
              <h2>Top explorers</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setView('leaderboards')}>
              See all <FiArrowRight aria-hidden="true" />
            </button>
          </header>
          {error ? (
            <ErrorBanner message={error} />
          ) : leaders.length ? (
            <ol className="leader-peek-list">
              {leaders.map((entry, index) => (
                <li key={entry.user.id}>
                  <span className={`rank-medal rank-medal--${index + 1}`}>
                    {entry.rank ?? index + 1}
                  </span>
                  <span className="avatar avatar--small">
                    {entry.user.handle.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{entry.user.handle}</strong>
                  <span>{formatScore(entry.score)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="An open trail"
              copy="Complete today’s expedition to set the first score."
            />
          )}
        </Card>

        <div className="dashboard-actions">
          <button
            className="action-card action-card--chat"
            type="button"
            onClick={() => setView('chat')}
          >
            <span className="action-card__icon">
              <FiMessageCircle aria-hidden="true" />
            </span>
            <span>
              <small>The Commons</small>
              <strong>Join the conversation</strong>
              <span>Talk with everyone on this Playstead.</span>
            </span>
            <FiArrowRight className="action-card__arrow" aria-hidden="true" />
          </button>
          <button
            className="action-card action-card--live"
            type="button"
            onClick={() => setView('live')}
          >
            <span className="action-card__icon">
              <FiRadio aria-hidden="true" />
            </span>
            <span>
              <small>Play together</small>
              <strong>Open a live table</strong>
              <span>Invite friends and guess at the same time.</span>
            </span>
            <FiUsers className="action-card__arrow" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
