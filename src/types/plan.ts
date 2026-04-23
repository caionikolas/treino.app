export type PlanFrequency = 'daily' | 'mon_to_sat' | 'mon_to_fri';
export type PlanStatus = 'idle' | 'active' | 'completed';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  color: string;
  frequency: PlanFrequency;
  reminderEnabled: boolean;
  reminderTime: string | null; // 'HH:MM'
  status: PlanStatus;
  currentIndex: number;
  startedAt: number | null;
  completedAt: number | null;
  lastAdvancedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PlanWorkout {
  id: string;
  planId: string;
  workoutId: string;
  orderIndex: number;
}

export interface PlanSummary {
  id: string;
  name: string;
  color: string;
  status: PlanStatus;
  workoutCount: number;
  currentIndex: number;
  reminderEnabled: boolean;
  reminderTime: string | null;
  updatedAt: number;
}

export interface PlanStats {
  totalSessions: number;       // sessões concluídas dentro do período do plano
  durationDays: number;        // dias entre startedAt e completedAt
  workoutsInSequence: number;  // total de itens em plan_workouts (atingido ao completar)
}
