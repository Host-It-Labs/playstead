import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiCompass,
  FiCopy,
  FiMapPin,
  FiRefreshCw,
} from 'react-icons/fi';
import { GameMap } from '../components/GameMap';
import { Button, Card, ErrorBanner, Eyebrow, LoadingState, Pill } from '../components/ui';
import { apiRequest, readableError } from '../lib/api';
import { formatDistance, formatScore, revealCoordinates } from '../lib/format';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import type {
  AtlasRoundResult,
  Coordinates,
  DailyGuessResponse,
  DailySession,
  DailySessionResponse,
} from '../types';

function ExpeditionSummary({ session }: { session: DailySession }) {
  const [copied, setCopied] = useState(false);
  const setView = useAppStore((state) => state.setView);

  const copyScore = async () => {
    const marks = session.results
      .map((result) => {
        const rawScore = result.score / result.target.multiplier;
        return rawScore >= 80 ? '●' : rawScore >= 50 ? '◐' : '○';
      })
      .join(' ');
    try {
      await navigator.clipboard.writeText(
        `Playstead · Atlas Drop ${session.date}\n${marks}\n${formatScore(session.totalScore)} points`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="expedition-summary">
      <div className="summary-seal" aria-hidden="true">
        <FiCompass />
      </div>
      <Eyebrow>Expedition complete</Eyebrow>
      <h2>{formatScore(session.totalScore)}</h2>
      <p className="summary-score-label">points across five drops</p>
      <ol className="round-results">
        {session.results.map((result) => (
          <li key={result.round}>
            <span className="result-round">{result.round}</span>
            <span>
              <strong>{result.target.name}</strong>
              <small>{formatDistance(result.distanceKm)} away</small>
            </span>
            <strong>{formatScore(result.score)}</strong>
          </li>
        ))}
      </ol>
      <div className="summary-actions">
        <Button type="button" onClick={copyScore}>
          {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy score'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setView('leaderboards')}>
          Leaderboard <FiChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function RevealPanel({
  reveal,
  isLast,
  onContinue,
}: {
  reveal: AtlasRoundResult;
  isLast: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="reveal-panel">
      <div className="reveal-panel__stamp">
        <FiCheck aria-hidden="true" /> Pin scored
      </div>
      <div>
        <Eyebrow>The place was</Eyebrow>
        <h2>{reveal.target.name}</h2>
      </div>
      <div className="reveal-stats">
        <div>
          <small>Distance</small>
          <strong>{formatDistance(reveal.distanceKm)}</strong>
        </div>
        <div>
          <small>Round score</small>
          <strong>+{formatScore(reveal.score)}</strong>
        </div>
      </div>
      <p className="reveal-story">{reveal.target.story}</p>
      <Button size="lg" type="button" onClick={onContinue}>
        {isLast ? 'See expedition' : 'Next place'} <FiChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}

export function DailyGamePage() {
  const token = useAuthStore((state) => state.token);
  const setView = useAppStore((state) => state.setView);
  const [session, setSession] = useState<DailySession | null>(null);
  const [draft, setDraft] = useState<Coordinates | null>(null);
  const [reveal, setReveal] = useState<AtlasRoundResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<DailySessionResponse>('/games/atlas-drop/daily/start', {
        method: 'POST',
        token,
      });
      setSession(response.session);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);

  const submitGuess = async () => {
    if (!token || !session || !draft || !session.target || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest<DailyGuessResponse>(
        `/games/atlas-drop/daily/${session.id}/guess`,
        { method: 'POST', token, body: draft },
      );
      setSession(response.session);
      setReveal(response.lastReveal);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const continueExpedition = () => {
    setReveal(null);
    setDraft(null);
  };

  const currentRound = reveal?.round ?? session?.target?.round ?? session?.currentRound ?? 1;
  const totalRounds = session?.totalRounds ?? 5;
  const complete = session?.status === 'completed' && !reveal;

  if (loading) {
    return (
      <div className="game-loading-page">
        <LoadingState label="Finding today’s five places…" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="game-loading-page">
        <Card className="load-error-card">
          <ErrorBanner message={error ?? 'Today’s expedition is unavailable.'} />
          <Button onClick={() => void start()}>
            <FiRefreshCw aria-hidden="true" /> Try again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="game-page daily-game-page">
      <header className="game-topbar">
        <button className="back-button" type="button" onClick={() => setView('home')}>
          <FiArrowLeft aria-hidden="true" /> <span>Home</span>
        </button>
        <div className="game-title">
          <span className="game-title__mark">
            <FiCompass aria-hidden="true" />
          </span>
          <span>
            <small>Daily expedition</small>
            <strong>Atlas Drop</strong>
          </span>
        </div>
        <div className="round-progress" aria-label={`Round ${currentRound} of ${totalRounds}`}>
          {Array.from({ length: totalRounds }, (_, index) => (
            <span
              key={index}
              className={
                index + 1 < currentRound || complete
                  ? 'is-done'
                  : index + 1 === currentRound
                    ? 'is-current'
                    : ''
              }
            />
          ))}
          <small>{complete ? 'Done' : `${currentRound}/${totalRounds}`}</small>
        </div>
        <div className="game-score">
          <small>Total</small>
          <strong>{formatScore(session.totalScore)}</strong>
        </div>
      </header>

      <div className="game-layout">
        <GameMap
          draft={draft}
          guess={reveal?.guess}
          answer={revealCoordinates(reveal)}
          interactive={!reveal && !complete}
          onDraftChange={setDraft}
        />

        <aside className="game-rail" aria-live="polite">
          {complete ? (
            <ExpeditionSummary session={session} />
          ) : reveal ? (
            <RevealPanel
              reveal={reveal}
              isLast={session.status === 'completed'}
              onContinue={continueExpedition}
            />
          ) : (
            <div className="prompt-panel">
              <div className="prompt-panel__top">
                <Pill tone="neutral">
                  Round {session.target?.round} of {totalRounds}
                </Pill>
                {(session.target?.multiplier ?? 1) > 1 ? (
                  <Pill tone="coral">×{session.target?.multiplier}</Pill>
                ) : null}
              </div>
              <div className="prompt-kind">
                <FiMapPin aria-hidden="true" /> {session.target?.kind ?? 'place'}
              </div>
              <h1>{session.target?.prompt}</h1>
              <p>Move around the map, then tap once to place your draft pin.</p>

              <div className={draft ? 'pin-status pin-status--ready' : 'pin-status'}>
                <span className="pin-status__icon">
                  <FiMapPin aria-hidden="true" />
                </span>
                {draft ? (
                  <span>
                    <strong>Pin ready</strong>
                    <small>
                      {draft.lat.toFixed(2)}°, {draft.lng.toFixed(2)}°
                    </small>
                  </span>
                ) : (
                  <span>
                    <strong>No pin yet</strong>
                    <small>Your first tap only places a draft.</small>
                  </span>
                )}
                {draft ? <FiCheck aria-label="Map tap accepted" /> : null}
              </div>
              {error ? <ErrorBanner message={error} /> : null}
              <Button
                size="lg"
                type="button"
                disabled={!draft}
                loading={submitting}
                onClick={() => void submitGuess()}
              >
                <FiMapPin aria-hidden="true" /> Confirm drop
              </Button>
              <p className="confirm-note">A confirmed pin cannot be moved.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
