import { create } from 'zustand';
import { WorkoutSummary, Workout, WorkoutExercise } from '@/types/workout';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { generateId } from '@/utils/generateId';

interface WorkoutState {
  summaries: WorkoutSummary[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (workout: Workout, exercises: WorkoutExercise[], isNew: boolean) => Promise<void>;
  duplicate: (id: string) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  summaries: [],
  loaded: false,

  load: async () => {
    const summaries = await workoutRepository.findAllSummaries();
    set({ summaries, loaded: true });
  },

  save: async (workout, exercises, isNew) => {
    if (isNew) {
      await workoutRepository.insert(workout, exercises);
    } else {
      await workoutRepository.update(workout.id, workout, exercises);
    }
    await get().load();
  },

  duplicate: async (id) => {
    const original = await workoutRepository.findById(id);
    if (!original) return null;

    const now = Date.now();
    const newId = generateId();
    const newWorkout: Workout = {
      ...original.workout,
      id: newId,
      name: `${original.workout.name} (cópia)`,
      createdAt: now,
      updatedAt: now,
    };
    const newExercises: WorkoutExercise[] = original.exercises.map((e, i) => ({
      ...e,
      id: generateId(),
      workoutId: newId,
      orderIndex: i,
    }));
    await workoutRepository.insert(newWorkout, newExercises);
    await get().load();
    return newId;
  },

  remove: async (id) => {
    await workoutRepository.delete(id);
    await get().load();
  },

  toggleFavorite: async (id) => {
    await workoutRepository.toggleFavorite(id);
    await get().load();
  },
}));
