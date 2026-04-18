import { MuscleGroupKey } from '@/constants/muscleGroups';

export interface WorkoutSession {
  id: string;
  workoutId: string;
  startedAt: number;
  finishedAt: number | null;
  durationSeconds: number | null;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  completed: number;
  notes: string | null;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupKey;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}

export interface LoggedSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  completed: boolean;
  loggedAt: number;
}
