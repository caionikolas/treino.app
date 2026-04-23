import { getDb } from '../connection';
import { Plan, PlanWorkout, PlanSummary, PlanStatus } from '@/types/plan';

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  frequency: string;
  reminder_enabled: number;
  reminder_time: string | null;
  status: string;
  current_index: number;
  started_at: number | null;
  completed_at: number | null;
  last_advanced_at: number | null;
  created_at: number;
  updated_at: number;
}

interface PlanWorkoutRow {
  id: string;
  plan_id: string;
  workout_id: string;
  order_index: number;
}

interface SummaryRow {
  id: string;
  name: string;
  color: string;
  status: string;
  current_index: number;
  reminder_enabled: number;
  reminder_time: string | null;
  updated_at: number;
  workout_count: number;
}

function rowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    frequency: row.frequency as Plan['frequency'],
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    status: row.status as PlanStatus,
    currentIndex: row.current_index,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastAdvancedAt: row.last_advanced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPlanWorkout(row: PlanWorkoutRow): PlanWorkout {
  return {
    id: row.id,
    planId: row.plan_id,
    workoutId: row.workout_id,
    orderIndex: row.order_index,
  };
}

export const planRepository = {
  async findAllSummaries(): Promise<PlanSummary[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT p.id, p.name, p.color, p.status, p.current_index, p.reminder_enabled,
              p.reminder_time, p.updated_at,
              COUNT(pw.id) AS workout_count
       FROM plans p
       LEFT JOIN plan_workouts pw ON pw.plan_id = p.id
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
    );
    return (result.rows ?? []).map(r => {
      const row = r as unknown as SummaryRow;
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        status: row.status as PlanStatus,
        currentIndex: row.current_index,
        workoutCount: typeof row.workout_count === 'number' ? row.workout_count : 0,
        reminderEnabled: row.reminder_enabled === 1,
        reminderTime: row.reminder_time,
        updatedAt: row.updated_at,
      };
    });
  },

  async findById(id: string): Promise<{ plan: Plan; workouts: PlanWorkout[] } | null> {
    const db = getDb();
    const pResult = await db.execute('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
    const pRow = pResult.rows?.[0];
    if (!pRow) return null;
    const wResult = await db.execute(
      'SELECT * FROM plan_workouts WHERE plan_id = ? ORDER BY order_index ASC',
      [id],
    );
    const workouts = (wResult.rows ?? []).map(r => rowToPlanWorkout(r as unknown as PlanWorkoutRow));
    return { plan: rowToPlan(pRow as unknown as PlanRow), workouts };
  },

  async insert(plan: Plan, workouts: PlanWorkout[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO plans (id, name, description, color, frequency,
            reminder_enabled, reminder_time, status, current_index,
            started_at, completed_at, last_advanced_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plan.id, plan.name, plan.description, plan.color, plan.frequency,
          plan.reminderEnabled ? 1 : 0, plan.reminderTime, plan.status, plan.currentIndex,
          plan.startedAt, plan.completedAt, plan.lastAdvancedAt, plan.createdAt, plan.updatedAt,
        ],
      );
      for (const pw of workouts) {
        await tx.execute(
          `INSERT INTO plan_workouts (id, plan_id, workout_id, order_index)
           VALUES (?, ?, ?, ?)`,
          [pw.id, pw.planId, pw.workoutId, pw.orderIndex],
        );
      }
    });
  },

  async update(id: string, plan: Plan, workouts: PlanWorkout[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `UPDATE plans SET name = ?, description = ?, color = ?, frequency = ?,
            reminder_enabled = ?, reminder_time = ?, status = ?, current_index = ?,
            started_at = ?, completed_at = ?, last_advanced_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          plan.name, plan.description, plan.color, plan.frequency,
          plan.reminderEnabled ? 1 : 0, plan.reminderTime, plan.status, plan.currentIndex,
          plan.startedAt, plan.completedAt, plan.lastAdvancedAt, plan.updatedAt, id,
        ],
      );
      await tx.execute('DELETE FROM plan_workouts WHERE plan_id = ?', [id]);
      for (const pw of workouts) {
        await tx.execute(
          `INSERT INTO plan_workouts (id, plan_id, workout_id, order_index)
           VALUES (?, ?, ?, ?)`,
          [pw.id, id, pw.workoutId, pw.orderIndex],
        );
      }
    });
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM plans WHERE id = ?', [id]);
  },

  async updateProgress(
    id: string,
    progress: {
      currentIndex: number;
      status: PlanStatus;
      lastAdvancedAt: number | null;
      completedAt: number | null;
    },
  ): Promise<void> {
    const db = getDb();
    await db.execute(
      `UPDATE plans
         SET current_index = ?, status = ?, last_advanced_at = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [progress.currentIndex, progress.status, progress.lastAdvancedAt, progress.completedAt, Date.now(), id],
    );
  },

  async findActivePlansContainingWorkout(workoutId: string): Promise<Plan[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT DISTINCT p.* FROM plans p
       JOIN plan_workouts pw ON pw.plan_id = p.id
       WHERE pw.workout_id = ? AND p.status = 'active'`,
      [workoutId],
    );
    return (result.rows ?? []).map(r => rowToPlan(r as unknown as PlanRow));
  },

  async findAllActive(): Promise<Plan[]> {
    const db = getDb();
    const result = await db.execute(`SELECT * FROM plans WHERE status = 'active'`);
    return (result.rows ?? []).map(r => rowToPlan(r as unknown as PlanRow));
  },

  async countWorkoutMembership(workoutId: string): Promise<number> {
    const db = getDb();
    const result = await db.execute(
      'SELECT COUNT(*) AS c FROM plan_workouts WHERE workout_id = ?',
      [workoutId],
    );
    const row = result.rows?.[0] as { c: number } | undefined;
    return row?.c ?? 0;
  },
};
