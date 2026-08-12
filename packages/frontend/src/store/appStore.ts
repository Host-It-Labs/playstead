import { create } from 'zustand';

export type AppView = 'home' | 'daily' | 'leaderboards' | 'chat' | 'live';

type AppState = {
  view: AppView;
  setView: (view: AppView) => void;
};

export const useAppStore = create<AppState>((set) => ({
  view: 'home',
  setView: (view) => set({ view }),
}));
