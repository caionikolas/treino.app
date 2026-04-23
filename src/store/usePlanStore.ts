import { create } from 'zustand';
import { Plan, PlanWorkout, PlanSummary } from '@/types/plan';
import { planRepository } from '@/database/repositories/planRepository';
import { reconcilePlan } from '@/services/planProgressService';
import { generateId } from '@/utils/generateId';

interface PlanState {
  summaries: PlanSummary[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (plan: Plan, workouts: PlanWorkout[], isNew: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  start: (id: string) => Promise<void>;
  restart: (id: string) => Promise<void>;
  reconcileAll: () => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  summaries: [],
  loaded: false,

  load: async () => {
    const summaries = await planRepository.findAllSummaries();
    set({ summaries, loaded: true });
  },

  save: async (plan, workouts, isNew) => {
    if (isNew) {
      await planRepository.insert(plan, workouts);
    } else {
      await planRepository.update(plan.id, plan, workouts);
    }
    await get().load();
  },

  remove: async (id) => {
    await planRepository.delete(id);
    await get().load();
  },

  start: async (id) => {
    const found = await planRepository.findById(id);
    if (!found) return;
    const now = Date.now();
    const updated: Plan = {
      ...found.plan,
      status: 'active',
      currentIndex: 0,
      startedAt: now,
      completedAt: null,
      lastAdvancedAt: now,
      updatedAt: now,
    };
    await planRepository.update(id, updated, found.workouts);
    await get().load();
  },

  restart: async (id) => {
    // same as start; semantically restarts a completed plan
    await get().start(id);
  },

  reconcileAll: async () => {
    const active = await planRepository.findAllActive();
    for (const p of active) {
      await reconcilePlan(p.id);
    }
    await get().load();
  },
}));

export function emptyPlan(): Plan {
  const now = Date.now();
  return {
    id: generateId(),
    name: '',
    description: null,
    color: '#E94560',
    frequency: 'daily',
    reminderEnabled: false,
    reminderTime: null,
    status: 'idle',
    currentIndex: 0,
    startedAt: null,
    completedAt: null,
    lastAdvancedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
