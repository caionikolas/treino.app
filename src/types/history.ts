import { WorkoutSession, SessionSet } from '@/types/session';

export interface StatsData {
  sessionsThisMonth: number;
  avgSessionsPerWeek: number;
  avgDurationSeconds: number;
  totalSessions: number;
}

export interface SessionWithMeta {
  session: WorkoutSession;
  workoutName: string;
  workoutColor: string;
}

export interface SessionDetail {
  session: WorkoutSession;
  workoutName: string;
  workoutColor: string;
  workoutExists: boolean;
  setsByExercise: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: SessionSet[];
  }>;
}
