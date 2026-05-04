import { create } from 'zustand';
import { DraftExercise, Workout, WorkoutExercise } from '@/types/workout';
import { DEFAULT_WORKOUT_COLOR } from '@/constants/workoutColors';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { generateId } from '@/utils/generateId';

const DEFAULT_SETS = 3;
const DEFAULT_REST = 90;
const DEFAULT_REPS = 12;

interface DraftState {
  id: string | null;
  name: string;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  exercises: DraftExercise[];
  originalSnapshot: string;

  loadNew: () => void;
  loadExisting: (
    id: string,
    exerciseLookup: (exerciseId: string) => { name: string; muscleGroup: MuscleGroupKey } | undefined,
  ) => Promise<void>;
  updateName: (name: string) => void;
  updateColor: (color: string) => void;
  updateDefaultSets: (n: number) => void;
  updateDefaultRest: (seconds: number) => void;

  addExercise: (exerciseId: string, exerciseName: string, muscleGroup: MuscleGroupKey) => void;
  removeExercise: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;

  updateSetReps: (exIndex: number, setIndex: number, reps: number) => void;
  addSet: (exIndex: number) => void;
  removeSet: (exIndex: number, setIndex: number) => void;
  toggleWarmup: (exIndex: number) => void;
  setWarmupReps: (exIndex: number, reps: number) => void;
  toggleRest: (exIndex: number) => void;
  updateRestSeconds: (exIndex: number, seconds: number) => void;

  hasExercise: (exerciseId: string) => boolean;
  isDirty: () => boolean;
  toPersist: () => { workout: Workout; exercises: WorkoutExercise[] };
  reset: () => void;
}

function snapshotOf(
  name: string,
  color: string,
  defaultSets: number,
  defaultRestSeconds: number,
  exercises: DraftExercise[],
): string {
  return JSON.stringify({ name, color, defaultSets, defaultRestSeconds, exercises });
}

function newDraftExercise(
  exerciseId: string,
  exerciseName: string,
  muscleGroup: MuscleGroupKey,
  defaultSets: number,
  defaultRest: number,
): DraftExercise {
  return {
    exerciseId,
    exerciseName,
    muscleGroup,
    repsPerSet: Array.from({ length: defaultSets }, () => DEFAULT_REPS),
    restSeconds: defaultRest,
    restEnabled: true,
    warmupEnabled: false,
    warmupReps: null,
  };
}

export const useWorkoutDraftStore = create<DraftState>((set, get) => ({
  id: null,
  name: '',
  color: DEFAULT_WORKOUT_COLOR,
  defaultSets: DEFAULT_SETS,
  defaultRestSeconds: DEFAULT_REST,
  exercises: [],
  originalSnapshot: '',

  loadNew: () => {
    const snap = snapshotOf('', DEFAULT_WORKOUT_COLOR, DEFAULT_SETS, DEFAULT_REST, []);
    set({
      id: null,
      name: '',
      color: DEFAULT_WORKOUT_COLOR,
      defaultSets: DEFAULT_SETS,
      defaultRestSeconds: DEFAULT_REST,
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
        repsPerSet: e.repsPerSet.length > 0 ? e.repsPerSet : [DEFAULT_REPS],
        restSeconds: e.restSeconds,
        restEnabled: e.restEnabled,
        warmupEnabled: e.warmupEnabled,
        warmupReps: e.warmupReps,
      };
    });
    const snap = snapshotOf(
      data.workout.name,
      data.workout.color,
      data.workout.defaultSets,
      data.workout.defaultRestSeconds,
      exercises,
    );
    set({
      id: data.workout.id,
      name: data.workout.name,
      color: data.workout.color,
      defaultSets: data.workout.defaultSets,
      defaultRestSeconds: data.workout.defaultRestSeconds,
      exercises,
      originalSnapshot: snap,
    });
  },

  updateName: (name) => set({ name }),
  updateColor: (color) => set({ color }),
  updateDefaultSets: (n) => set({ defaultSets: Math.max(1, n) }),
  updateDefaultRest: (seconds) => set({ defaultRestSeconds: Math.max(0, seconds) }),

  addExercise: (exerciseId, exerciseName, muscleGroup) => {
    const { defaultSets, defaultRestSeconds } = get();
    set(state => ({
      exercises: [
        ...state.exercises,
        newDraftExercise(exerciseId, exerciseName, muscleGroup, defaultSets, defaultRestSeconds),
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

  updateSetReps: (exIndex, setIndex, reps) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => {
        if (i !== exIndex) return e;
        if (setIndex < 0 || setIndex >= e.repsPerSet.length) return e;
        const next = [...e.repsPerSet];
        next[setIndex] = Math.max(0, reps);
        return { ...e, repsPerSet: next };
      }),
    }));
  },

  addSet: (exIndex) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => {
        if (i !== exIndex) return e;
        const last = e.repsPerSet[e.repsPerSet.length - 1] ?? DEFAULT_REPS;
        return { ...e, repsPerSet: [...e.repsPerSet, last] };
      }),
    }));
  },

  removeSet: (exIndex, setIndex) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => {
        if (i !== exIndex) return e;
        if (e.repsPerSet.length <= 1) return e;
        return { ...e, repsPerSet: e.repsPerSet.filter((_, k) => k !== setIndex) };
      }),
    }));
  },

  toggleWarmup: (exIndex) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => {
        if (i !== exIndex) return e;
        const enabled = !e.warmupEnabled;
        return { ...e, warmupEnabled: enabled, warmupReps: enabled ? (e.warmupReps ?? 10) : null };
      }),
    }));
  },

  setWarmupReps: (exIndex, reps) => {
    set(state => ({
      exercises: state.exercises.map((e, i) =>
        i === exIndex ? { ...e, warmupReps: Math.max(0, reps) } : e,
      ),
    }));
  },

  toggleRest: (exIndex) => {
    set(state => ({
      exercises: state.exercises.map((e, i) =>
        i === exIndex ? { ...e, restEnabled: !e.restEnabled } : e,
      ),
    }));
  },

  updateRestSeconds: (exIndex, seconds) => {
    set(state => ({
      exercises: state.exercises.map((e, i) =>
        i === exIndex ? { ...e, restSeconds: Math.max(0, seconds) } : e,
      ),
    }));
  },

  hasExercise: (exerciseId) => get().exercises.some(e => e.exerciseId === exerciseId),

  isDirty: () => {
    const { name, color, defaultSets, defaultRestSeconds, exercises, originalSnapshot } = get();
    return snapshotOf(name, color, defaultSets, defaultRestSeconds, exercises) !== originalSnapshot;
  },

  toPersist: () => {
    const { id, name, color, defaultSets, defaultRestSeconds, exercises } = get();
    const now = Date.now();
    const workoutId = id ?? generateId();
    const workout: Workout = {
      id: workoutId,
      name: name.trim(),
      description: null,
      color,
      defaultSets,
      defaultRestSeconds,
      createdAt: now,
      updatedAt: now,
    };
    const workoutExercises: WorkoutExercise[] = exercises.map((e, i) => ({
      id: generateId(),
      workoutId,
      exerciseId: e.exerciseId,
      orderIndex: i,
      sets: e.repsPerSet.length,
      reps: e.repsPerSet.join('-'),
      repsPerSet: e.repsPerSet,
      restSeconds: e.restSeconds,
      restEnabled: e.restEnabled,
      warmupEnabled: e.warmupEnabled,
      warmupReps: e.warmupReps,
      notes: null,
    }));
    return { workout, exercises: workoutExercises };
  },

  reset: () => set({
    id: null,
    name: '',
    color: DEFAULT_WORKOUT_COLOR,
    defaultSets: DEFAULT_SETS,
    defaultRestSeconds: DEFAULT_REST,
    exercises: [],
    originalSnapshot: '',
  }),
}));
