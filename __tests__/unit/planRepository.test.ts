import { runMigrations } from '@/database/migrations';
import { planRepository } from '@/database/repositories/planRepository';
import { Plan, PlanWorkout, PlanStatus } from '@/types/plan';

jest.mock('@/database/connection', () => {
  const Database = require('better-sqlite3');
  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        inst = {
          execute: async (sql: string, params?: any[]) => {
            const trimmed = sql.trim().toLowerCase();
            if (trimmed.startsWith('select')) {
              const rows = db.prepare(sql).all(...(params ?? []));
              return { rows };
            }
            db.prepare(sql).run(...(params ?? []));
            return { rows: [] };
          },
          executeSync: (sql: string) => {
            db.exec(sql);
          },
          transaction: async (fn: any) => {
            db.exec('BEGIN');
            try {
              await fn({
                execute: async (sql: string, params?: any[]) => {
                  db.prepare(sql).run(...(params ?? []));
                  return { rows: [] };
                },
              });
              db.exec('COMMIT');
            } catch (e) {
              db.exec('ROLLBACK');
              throw e;
            }
          },
          close: () => db.close(),
        };
      }
      return inst;
    },
    __resetDb: () => {
      if (inst) {
        try { inst.close(); } catch {}
        inst = null;
      }
    },
  };
});

beforeEach(async () => {
  const { __resetDb, getDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
  const db = getDb();
  await db.execute(
    `INSERT INTO workouts (id, name, description, color, created_at, updated_at, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    ['w1', 'Treino A', null, '#E94560', 1, 1],
  );
  await db.execute(
    `INSERT INTO workouts (id, name, description, color, created_at, updated_at, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    ['w2', 'Treino B', null, '#0F3460', 1, 1],
  );
});

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p1',
    name: 'Plano Força',
    description: null,
    color: '#E94560',
    frequency: 'daily',
    reminderEnabled: false,
    reminderTime: null,
    status: 'idle',
    currentIndex: 0,
    startedAt: null,
    completedAt: null,
    lastAdvancedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makePlanWorkout(overrides: Partial<PlanWorkout> = {}): PlanWorkout {
  return {
    id: 'pw1',
    planId: 'p1',
    workoutId: 'w1',
    orderIndex: 0,
    ...overrides,
  };
}

describe('planRepository', () => {
  it('insert + findById returns correct plan and workouts in order', async () => {
    const plan = makePlan();
    const workouts: PlanWorkout[] = [
      makePlanWorkout({ id: 'pw1', workoutId: 'w1', orderIndex: 0 }),
      makePlanWorkout({ id: 'pw2', workoutId: 'w2', orderIndex: 1 }),
    ];

    await planRepository.insert(plan, workouts);
    const result = await planRepository.findById('p1');

    expect(result).not.toBeNull();
    expect(result!.plan.id).toBe('p1');
    expect(result!.plan.name).toBe('Plano Força');
    expect(result!.plan.status).toBe('idle');
    expect(result!.plan.frequency).toBe('daily');
    expect(result!.plan.reminderEnabled).toBe(false);
    expect(result!.workouts.length).toBe(2);
    expect(result!.workouts[0].workoutId).toBe('w1');
    expect(result!.workouts[0].orderIndex).toBe(0);
    expect(result!.workouts[1].workoutId).toBe('w2');
    expect(result!.workouts[1].orderIndex).toBe(1);
  });

  it('findById returns null for unknown id', async () => {
    const result = await planRepository.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('findAllSummaries includes workoutCount', async () => {
    await planRepository.insert(makePlan({ id: 'p1', name: 'Plano 1', updatedAt: 100 }), [
      makePlanWorkout({ id: 'pw1', planId: 'p1', workoutId: 'w1', orderIndex: 0 }),
      makePlanWorkout({ id: 'pw2', planId: 'p1', workoutId: 'w2', orderIndex: 1 }),
    ]);
    await planRepository.insert(makePlan({ id: 'p2', name: 'Plano 2', updatedAt: 200 }), []);

    const summaries = await planRepository.findAllSummaries();
    expect(summaries.length).toBe(2);
    // ordered by updatedAt DESC
    expect(summaries[0].id).toBe('p2');
    expect(summaries[0].workoutCount).toBe(0);
    expect(summaries[1].id).toBe('p1');
    expect(summaries[1].workoutCount).toBe(2);
  });

  it('update replaces workouts', async () => {
    await planRepository.insert(makePlan(), [
      makePlanWorkout({ id: 'pw1', workoutId: 'w1', orderIndex: 0 }),
      makePlanWorkout({ id: 'pw2', workoutId: 'w2', orderIndex: 1 }),
    ]);

    const updatedPlan = makePlan({ name: 'Plano Atualizado', updatedAt: 9999 });
    await planRepository.update('p1', updatedPlan, [
      makePlanWorkout({ id: 'pw3', workoutId: 'w2', orderIndex: 0 }),
    ]);

    const result = await planRepository.findById('p1');
    expect(result).not.toBeNull();
    expect(result!.plan.name).toBe('Plano Atualizado');
    expect(result!.workouts.length).toBe(1);
    expect(result!.workouts[0].id).toBe('pw3');
    expect(result!.workouts[0].workoutId).toBe('w2');
  });

  it('delete cascades to plan_workouts', async () => {
    await planRepository.insert(makePlan(), [
      makePlanWorkout({ id: 'pw1', workoutId: 'w1', orderIndex: 0 }),
    ]);

    await planRepository.delete('p1');

    const result = await planRepository.findById('p1');
    expect(result).toBeNull();

    // Verify plan_workouts are also gone (cascade)
    const count = await planRepository.countWorkoutMembership('w1');
    expect(count).toBe(0);
  });

  it('updateProgress writes currentIndex, status, lastAdvancedAt, completedAt', async () => {
    await planRepository.insert(makePlan({ status: 'idle', currentIndex: 0 }), [
      makePlanWorkout({ id: 'pw1', workoutId: 'w1', orderIndex: 0 }),
    ]);

    await planRepository.updateProgress('p1', {
      currentIndex: 2,
      status: 'active',
      lastAdvancedAt: 5000,
      completedAt: null,
    });

    const result = await planRepository.findById('p1');
    expect(result).not.toBeNull();
    expect(result!.plan.currentIndex).toBe(2);
    expect(result!.plan.status).toBe('active');
    expect(result!.plan.lastAdvancedAt).toBe(5000);
    expect(result!.plan.completedAt).toBeNull();
  });

  it('findActivePlansContainingWorkout returns only active plans containing workoutId', async () => {
    await planRepository.insert(makePlan({ id: 'p1', status: 'active' }), [
      makePlanWorkout({ id: 'pw1', planId: 'p1', workoutId: 'w1', orderIndex: 0 }),
    ]);
    await planRepository.insert(makePlan({ id: 'p2', status: 'idle' }), [
      makePlanWorkout({ id: 'pw2', planId: 'p2', workoutId: 'w1', orderIndex: 0 }),
    ]);
    await planRepository.insert(makePlan({ id: 'p3', status: 'active' }), [
      makePlanWorkout({ id: 'pw3', planId: 'p3', workoutId: 'w2', orderIndex: 0 }),
    ]);

    const results = await planRepository.findActivePlansContainingWorkout('w1');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('p1');
    expect(results[0].status).toBe('active');
  });

  it('findAllActive returns only active plans', async () => {
    await planRepository.insert(makePlan({ id: 'p1', status: 'active' }), []);
    await planRepository.insert(makePlan({ id: 'p2', status: 'idle' }), []);
    await planRepository.insert(makePlan({ id: 'p3', status: 'completed' }), []);

    const active = await planRepository.findAllActive();
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('p1');
  });

  it('countWorkoutMembership counts across all plans', async () => {
    await planRepository.insert(makePlan({ id: 'p1' }), [
      makePlanWorkout({ id: 'pw1', planId: 'p1', workoutId: 'w1', orderIndex: 0 }),
    ]);
    await planRepository.insert(makePlan({ id: 'p2' }), [
      makePlanWorkout({ id: 'pw2', planId: 'p2', workoutId: 'w1', orderIndex: 0 }),
      makePlanWorkout({ id: 'pw3', planId: 'p2', workoutId: 'w2', orderIndex: 1 }),
    ]);

    expect(await planRepository.countWorkoutMembership('w1')).toBe(2);
    expect(await planRepository.countWorkoutMembership('w2')).toBe(1);
    expect(await planRepository.countWorkoutMembership('w-unknown')).toBe(0);
  });
});
