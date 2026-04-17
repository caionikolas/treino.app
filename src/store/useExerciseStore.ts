import { create } from 'zustand';
import { Exercise } from '@/types/exercise';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';
import { exerciseRepository } from '@/database/repositories/exerciseRepository';

interface ExerciseState {
  all: Exercise[];
  search: string;
  muscleGroup: MuscleGroupKey | 'all';
  category: CategoryKey | 'all';
  loaded: boolean;

  load: () => Promise<void>;
  setSearch: (s: string) => void;
  setMuscleGroup: (g: MuscleGroupKey | 'all') => void;
  setCategory: (c: CategoryKey | 'all') => void;
  filtered: () => Exercise[];
  findById: (id: string) => Exercise | undefined;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  all: [],
  search: '',
  muscleGroup: 'all',
  category: 'all',
  loaded: false,

  load: async () => {
    const all = await exerciseRepository.findAll();
    set({ all, loaded: true });
  },

  setSearch: (s) => set({ search: s }),
  setMuscleGroup: (g) => set({ muscleGroup: g }),
  setCategory: (c) => set({ category: c }),

  filtered: () => {
    const { all, search, muscleGroup, category } = get();
    const q = search.trim().toLowerCase();
    return all.filter(ex => {
      if (muscleGroup !== 'all' && ex.muscleGroup !== muscleGroup) return false;
      if (category !== 'all' && ex.category !== category && ex.category !== 'both') return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  findById: (id) => get().all.find(ex => ex.id === id),
}));
