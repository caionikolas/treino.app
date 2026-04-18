import { MuscleGroupKey } from '@/constants/muscleGroups';

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  color: string;
  exerciseCount: number;
  updatedAt: number;
}

export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupKey;
  sets: number;
  reps: string;
  restSeconds: number;
}
