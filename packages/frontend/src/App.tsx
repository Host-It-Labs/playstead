import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DailyGamePage } from './pages/DailyGamePage';
import { DashboardPage } from './pages/DashboardPage';
import { LeaderboardsPage } from './pages/LeaderboardsPage';
import { LiveTablesPage } from './pages/LiveTablesPage';
import { useAppStore } from './store/appStore';
import { useAuthStore } from './store/authStore';

export function App() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const view = useAppStore((state) => state.view);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === 'checking') {
    return (
      <div className="boot-screen">
        <LoadingState label="Opening Playstead…" />
      </div>
    );
  }

  if (status === 'anonymous') return <AuthPage />;

  return (
    <AppShell>
      {view === 'home' ? <DashboardPage /> : null}
      {view === 'daily' ? <DailyGamePage /> : null}
      {view === 'leaderboards' ? <LeaderboardsPage /> : null}
      {view === 'chat' ? <ChatPage /> : null}
      {view === 'live' ? <LiveTablesPage /> : null}
    </AppShell>
  );
}
