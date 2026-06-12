import { create } from 'zustand';
import { BossView, MasteryLevel } from '@/types/boss';
import { BOSSES } from '@/constants/bosses';
import { progressionProgressRepository } from '@/database/repositories/progressionProgressRepository';
import { buildBossViews } from '@/services/bossProgressService';

interface BossState {
  views: BossView[];
  loaded: boolean;
  load: () => Promise<void>;
  setLevel: (progressionId: string, level: MasteryLevel) => Promise<void>;
  getView: (bossId: string) => BossView | undefined;
}

export const useBossStore = create<BossState>((set, get) => ({
  views: [],
  loaded: false,

  load: async () => {
    const levels = await progressionProgressRepository.getAllLevels();
    set({ views: buildBossViews(BOSSES, levels), loaded: true });
  },

  setLevel: async (progressionId, level) => {
    await progressionProgressRepository.setLevel(progressionId, level);
    await get().load();
  },

  getView: bossId => get().views.find(v => v.boss.id === bossId),
}));
