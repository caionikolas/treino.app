import { create } from 'zustand';
import { DraftExercise, Workout, WorkoutExercise } from '@/types/workout';
import { DEFAULT_WORKOUT_COLOR } from '@/constants/workoutColors';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { generateId } from '@/utils/generateId';

interface DraftState {
  id: string | null;
  name: string;
  color: string;
  exercises: DraftExercise[];
  originalSnapshot: string;

  loadNew: () => void;
  loadExisting: (
    id: string,
    exerciseLookup: (exerciseId: string) => { name: string; muscleGroup: MuscleGroupKey } | undefined,
  ) => Promise<void>;
  updateName: (name: string) => void;
  updateColor: (color: string) => void;
  addExercise: (exerciseId: string, exerciseName: string, muscleGroup: MuscleGroupKey) => void;
  removeExercise: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  updateExerciseConfig: (
    index: number,
    patch: Partial<Pick<DraftExercise, 'sets' | 'reps' | 'restSeconds'>>,
  ) => void;
  hasExercise: (exerciseId: string) => boolean;
  isDirty: () => boolean;
  toPersist: () => { workout: Workout; exercises: WorkoutExercise[] };
  reset: () => void;
}

function snapshotOf(name: string, color: string, exercises: DraftExercise[]): string {
  return JSON.stringify({ name, color, exercises });
}

export const useWorkoutDraftStore = create<DraftState>((set, get) => ({
  id: null,
  name: '',
  color: DEFAULT_WORKOUT_COLOR,
  exercises: [],
  originalSnapshot: '',

  loadNew: () => {
    const snap = snapshotOf('', DEFAULT_WORKOUT_COLOR, []);
    set({
      id: null,
      name: '',
      color: DEFAULT_WORKOUT_COLOR,
      exercises: [],
      originalSnapshot: snap,
    });
  },

  loadExisting: async (id, exerciseLookup) => {
    const data = await workoutRepository.findById(id);
    if (!data) {
      get().loadNew();
      return;
    }
    const exercises: DraftExercise[] = data.exercises.map(e => {
      const info = exerciseLookup(e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseName: info?.name ?? e.exerciseId,
        muscleGroup: info?.muscleGroup ?? 'chest',
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    const snap = snapshotOf(data.workout.name, data.workout.color, exercises);
    set({
      id: data.workout.id,
      name: data.workout.name,
      color: data.workout.color,
      exercises,
      originalSnapshot: snap,
    });
  },

  updateName: (name) => set({ name }),
  updateColor: (color) => set({ color }),

  addExercise: (exerciseId, exerciseName, muscleGroup) => {
    set(state => ({
      exercises: [
        ...state.exercises,
        { exerciseId, exerciseName, muscleGroup, sets: 4, reps: '12', restSeconds: 90 },
      ],
    }));
  },

  removeExercise: (index) => {
    set(state => ({
      exercises: state.exercises.filter((_, i) => i !== index),
    }));
  },

  moveUp: (index) => {
    set(state => {
      if (index <= 0 || index >= state.exercises.length) return {};
      const next = [...state.exercises];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { exercises: next };
    });
  },

  moveDown: (index) => {
    set(state => {
      if (index < 0 || index >= state.exercises.length - 1) return {};
      const next = [...state.exercises];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return { exercises: next };
    });
  },

  updateExerciseConfig: (index, patch) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  },

  hasExercise: (exerciseId) => get().exercises.some(e => e.exerciseId === exerciseId),

  isDirty: () => {
    const { name, color, exercises, originalSnapshot } = get();
    return snapshotOf(name, color, exercises) !== originalSnapshot;
  },

  toPersist: () => {
    const { id, name, color, exercises } = get();
    const now = Date.now();
    const workoutId = id ?? generateId();
    const workout: Workout = {
      id: workoutId,
      name: name.trim(),
      description: null,
      color,
      createdAt: now,
      updatedAt: now,
    };
    const workoutExercises: WorkoutExercise[] = exercises.map((e, i) => ({
      id: generateId(),
      workoutId,
      exerciseId: e.exerciseId,
      orderIndex: i,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      notes: null,
    }));
    return { workout, exercises: workoutExercises };
  },

  reset: () => set({
    id: null,
    name: '',
    color: DEFAULT_WORKOUT_COLOR,
    exercises: [],
    originalSnapshot: '',
  }),
}));
