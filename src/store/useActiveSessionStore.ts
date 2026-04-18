import { create } from 'zustand';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { ActiveExercise, LoggedSet, WorkoutSession, SessionSet } from '@/types/session';
import { generateId } from '@/utils/generateId';

interface ActiveSessionState {
  sessionId: string | null;
  workoutId: string | null;
  startedAt: number | null;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetNumber: number;
  loggedSets: LoggedSet[];
  restEndsAt: number | null;
  notes: string;

  start: (
    workoutId: string,
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      muscleGroup: MuscleGroupKey;
      sets: number;
      reps: string;
      restSeconds: number;
    }>,
  ) => void;

  logSet: (reps: number, weightKg: number | null) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  skipExercise: () => void;

  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;

  setNotes: (notes: string) => void;

  finalize: () => { session: WorkoutSession; sets: SessionSet[] };
  reset: () => void;

  currentExercise: () => ActiveExercise | null;
  lastSetForExercise: (exerciseId: string) => LoggedSet | undefined;
  isLastSetOfLastExercise: () => boolean;
}

function countLoggedForExercise(sets: LoggedSet[], exerciseId: string): number {
  return sets.filter(s => s.exerciseId === exerciseId).length;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => ({
  sessionId: null,
  workoutId: null,
  startedAt: null,
  exercises: [],
  currentExerciseIndex: 0,
  currentSetNumber: 1,
  loggedSets: [],
  restEndsAt: null,
  notes: '',

  start: (workoutId, exercises) => {
    set({
      sessionId: generateId(),
      workoutId,
      startedAt: Date.now(),
      exercises: exercises.map(e => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        muscleGroup: e.muscleGroup,
        targetSets: e.sets,
        targetReps: e.reps,
        restSeconds: e.restSeconds,
      })),
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      loggedSets: [],
      restEndsAt: null,
      notes: '',
    });
  },

  logSet: (reps, weightKg) => {
    const state = get();
    const currentEx = state.exercises[state.currentExerciseIndex];
    if (!currentEx) return;
    const loggedSet: LoggedSet = {
      exerciseId: currentEx.exerciseId,
      setNumber: state.currentSetNumber,
      reps,
      weightKg,
      completed: true,
      loggedAt: Date.now(),
    };
    const nextLoggedSets = [...state.loggedSets, loggedSet];

    const wasLastSet = state.currentSetNumber >= currentEx.targetSets;
    if (wasLastSet) {
      const nextIndex = state.currentExerciseIndex + 1;
      const nextEx = state.exercises[nextIndex];
      set({
        loggedSets: nextLoggedSets,
        currentExerciseIndex: nextIndex < state.exercises.length ? nextIndex : state.currentExerciseIndex,
        currentSetNumber: nextEx ? countLoggedForExercise(nextLoggedSets, nextEx.exerciseId) + 1 : state.currentSetNumber,
        restEndsAt: Date.now() + currentEx.restSeconds * 1000,
      });
    } else {
      set({
        loggedSets: nextLoggedSets,
        currentSetNumber: state.currentSetNumber + 1,
        restEndsAt: Date.now() + currentEx.restSeconds * 1000,
      });
    }
  },

  nextExercise: () => {
    const state = get();
    const nextIndex = Math.min(state.currentExerciseIndex + 1, state.exercises.length - 1);
    const nextEx = state.exercises[nextIndex];
    set({
      currentExerciseIndex: nextIndex,
      currentSetNumber: nextEx ? countLoggedForExercise(state.loggedSets, nextEx.exerciseId) + 1 : 1,
      restEndsAt: null,
    });
  },

  previousExercise: () => {
    const state = get();
    const prevIndex = Math.max(state.currentExerciseIndex - 1, 0);
    const prevEx = state.exercises[prevIndex];
    set({
      currentExerciseIndex: prevIndex,
      currentSetNumber: prevEx ? countLoggedForExercise(state.loggedSets, prevEx.exerciseId) + 1 : 1,
      restEndsAt: null,
    });
  },

  skipExercise: () => {
    get().nextExercise();
  },

  adjustRest: (deltaSeconds) => {
    const current = get().restEndsAt;
    if (current == null) return;
    set({ restEndsAt: current + deltaSeconds * 1000 });
  },

  skipRest: () => set({ restEndsAt: null }),

  setNotes: (notes) => set({ notes }),

  finalize: () => {
    const state = get();
    const now = Date.now();
    const duration = state.startedAt ? Math.floor((now - state.startedAt) / 1000) : 0;
    const session: WorkoutSession = {
      id: state.sessionId ?? generateId(),
      workoutId: state.workoutId ?? '',
      startedAt: state.startedAt ?? now,
      finishedAt: now,
      durationSeconds: duration,
      notes: state.notes.trim() || null,
    };
    const sessionId = session.id;
    const sets: SessionSet[] = state.loggedSets.map(ls => ({
      id: generateId(),
      sessionId,
      exerciseId: ls.exerciseId,
      setNumber: ls.setNumber,
      reps: ls.reps,
      weightKg: ls.weightKg,
      completed: ls.completed ? 1 : 0,
      notes: null,
    }));
    return { session, sets };
  },

  reset: () => set({
    sessionId: null,
    workoutId: null,
    startedAt: null,
    exercises: [],
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    loggedSets: [],
    restEndsAt: null,
    notes: '',
  }),

  currentExercise: () => {
    const state = get();
    return state.exercises[state.currentExerciseIndex] ?? null;
  },

  lastSetForExercise: (exerciseId) => {
    const state = get();
    const matches = state.loggedSets.filter(s => s.exerciseId === exerciseId);
    return matches[matches.length - 1];
  },

  isLastSetOfLastExercise: () => {
    const state = get();
    const lastIndex = state.exercises.length - 1;
    const currentEx = state.exercises[state.currentExerciseIndex];
    if (!currentEx) return false;
    return state.currentExerciseIndex === lastIndex && state.currentSetNumber >= currentEx.targetSets;
  },
}));
