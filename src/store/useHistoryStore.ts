import { create } from 'zustand';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { SessionWithMeta, StatsData } from '@/types/history';

interface HistoryState {
  sessionsByMonth: Record<string, SessionWithMeta[]>;
  datesByMonth: Record<string, string[]>;
  stats: StatsData | null;

  loadMonth: (yearMonth: string) => Promise<void>;
  loadStats: () => Promise<void>;
  invalidate: () => void;
}

function monthRange(yearMonth: string): { start: number; end: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();
  return { start, end };
}

export const useHistoryStore = create<HistoryState>((set) => ({
  sessionsByMonth: {},
  datesByMonth: {},
  stats: null,

  loadMonth: async (yearMonth) => {
    const { start, end } = monthRange(yearMonth);
    const [sessions, dates] = await Promise.all([
      sessionRepository.findByDateRange(start, end),
      sessionRepository.findDatesWithSessions(start, end),
    ]);

    const summaries = await workoutRepository.findAllSummaries();
    const nameById = new Map(summaries.map(s => [s.id, { name: s.name, color: s.color }]));

    const enriched: SessionWithMeta[] = sessions.map(s => {
      const meta = nameById.get(s.workoutId);
      return {
        session: s,
        workoutName: meta?.name ?? 'Treino removido',
        workoutColor: meta?.color ?? '#8E8E93',
      };
    });

    set(state => ({
      sessionsByMonth: { ...state.sessionsByMonth, [yearMonth]: enriched },
      datesByMonth: { ...state.datesByMonth, [yearMonth]: dates },
    }));
  },

  loadStats: async () => {
    const stats = await sessionRepository.getStats();
    set({ stats });
  },

  invalidate: () => {
    set({ sessionsByMonth: {}, datesByMonth: {}, stats: null });
  },
}));
