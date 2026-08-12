import { type FormEvent, useEffect, useState } from 'react';
import { FiArrowRight, FiMessageCircle, FiUsers } from 'react-icons/fi';
import { Logo } from '../components/Logo';
import { Button, ErrorBanner, Field, Pill } from '../components/ui';
import { useAuthStore } from '../store/authStore';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);

  useEffect(() => clearError, [clearError]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === 'login') await login(handle, password);
      else await register(handle, password);
    } catch {
      // The store owns the player-facing error.
    }
  };

  const switchMode = () => {
    clearError();
    setMode((current) => (current === 'login' ? 'register' : 'login'));
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story__topline">
          <Logo />
          <Pill tone="success">Self-hosted</Pill>
        </div>
        <div className="auth-story__copy">
          <p className="eyebrow">A place to play</p>
          <h1>Gather around the world.</h1>
          <p>
            Drop pins, compare hunches, and stay for the conversation. Your Playstead belongs to
            your people.
          </p>
        </div>
        <div className="auth-map-art" aria-hidden="true">
          <span className="auth-map-art__sun" />
          <span className="auth-map-art__land auth-map-art__land--one" />
          <span className="auth-map-art__land auth-map-art__land--two" />
          <span className="auth-map-art__route" />
          <span className="auth-map-art__pin auth-map-art__pin--one" />
          <span className="auth-map-art__pin auth-map-art__pin--two" />
        </div>
        <div className="auth-story__features">
          <span>
            <FiUsers aria-hidden="true" /> Live tables
          </span>
          <span>
            <FiMessageCircle aria-hidden="true" /> Commons & circles
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__card">
          <div>
            <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Pull up a chair'}</p>
            <h2>{mode === 'login' ? 'Enter your Playstead' : 'Create your explorer'}</h2>
            <p className="muted">
              {mode === 'login'
                ? 'Your next expedition is waiting.'
                : 'Choose the name others will see at the table.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {error ? <ErrorBanner message={error} /> : null}
            <Field
              label="Handle"
              name="handle"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="mosswalker"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
            <Button type="submit" size="lg" loading={status === 'checking'}>
              {mode === 'login' ? 'Enter Playstead' : 'Create account'}
              <FiArrowRight aria-hidden="true" />
            </Button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? 'New around here?' : 'Already have a seat?'}{' '}
            <button type="button" onClick={switchMode}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
        <p className="auth-panel__footnote">
          One account, local to this Playstead. Nothing leaves your instance.
        </p>
      </section>
    </main>
  );
}
