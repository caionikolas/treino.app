import { create } from 'zustand';
import { settingsRepository } from '@/database/repositories/settingsRepository';

interface SettingsState {
  username: string;
  loaded: boolean;
  load: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  username: '',
  loaded: false,
  load: async () => {
    const v = await settingsRepository.get('username');
    set({ username: v ?? '', loaded: true });
  },
  setUsername: async (name) => {
    await settingsRepository.set('username', name);
    set({ username: name });
  },
}));
