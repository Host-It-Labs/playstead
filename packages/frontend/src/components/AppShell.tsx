import clsx from 'clsx';
import type { ReactNode } from 'react';
import { FiBarChart2, FiCompass, FiHome, FiLogOut, FiMessageCircle, FiUsers } from 'react-icons/fi';
import { Logo } from './Logo';
import { useAuthStore } from '../store/authStore';
import { type AppView, useAppStore } from '../store/appStore';

const navigation: Array<{
  view: AppView;
  label: string;
  shortLabel: string;
  icon: typeof FiHome;
}> = [
  { view: 'home', label: 'Home', shortLabel: 'Home', icon: FiHome },
  { view: 'daily', label: 'Atlas Drop', shortLabel: 'Play', icon: FiCompass },
  {
    view: 'leaderboards',
    label: 'Leaderboards',
    shortLabel: 'Ranks',
    icon: FiBarChart2,
  },
  { view: 'chat', label: 'Chats', shortLabel: 'Chats', icon: FiMessageCircle },
  { view: 'live', label: 'Live tables', shortLabel: 'Live', icon: FiUsers },
];

export function AppShell({ children }: { children: ReactNode }) {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <button className="brand-button" type="button" onClick={() => setView('home')}>
          <Logo />
        </button>
        <nav className="side-nav__links" aria-label="Main navigation">
          {navigation.map(({ view: itemView, label, icon: Icon }) => (
            <button
              className={clsx('nav-link', view === itemView && 'is-active')}
              key={itemView}
              type="button"
              aria-current={view === itemView ? 'page' : undefined}
              onClick={() => setView(itemView)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-nav__account">
          <span className="avatar" aria-hidden="true">
            {user?.handle.slice(0, 2).toUpperCase()}
          </span>
          <span className="side-nav__identity">
            <strong>{user?.handle}</strong>
            <small>Explorer</small>
          </span>
          <button
            className="icon-button"
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={logout}
          >
            <FiLogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="brand-button" type="button" onClick={() => setView('home')}>
          <Logo />
        </button>
        <span className="avatar" aria-label={`Signed in as ${user?.handle}`}>
          {user?.handle.slice(0, 2).toUpperCase()}
        </span>
      </header>

      <main className="app-content">{children}</main>

      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map(({ view: itemView, shortLabel, icon: Icon }) => (
          <button
            className={clsx('mobile-nav__link', view === itemView && 'is-active')}
            key={itemView}
            type="button"
            aria-current={view === itemView ? 'page' : undefined}
            onClick={() => setView(itemView)}
          >
            <Icon aria-hidden="true" />
            <span>{shortLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
