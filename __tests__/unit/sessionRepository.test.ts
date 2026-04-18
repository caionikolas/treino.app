import { runMigrations } from '@/database/migrations';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { WorkoutSession, SessionSet } from '@/types/session';

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
    `INSERT INTO exercises (id, name, muscle_group, category, created_at)
     VALUES ('ex-1', 'Test', 'chest', 'strength', 0)`,
  );
  await db.execute(
    `INSERT INTO workouts (id, name, color, created_at, updated_at)
     VALUES ('w-1', 'Treino', '#E94560', 0, 0)`,
  );
});

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's-1',
    workoutId: 'w-1',
    startedAt: 1000,
    finishedAt: 2000,
    durationSeconds: 1000,
    notes: null,
    ...overrides,
  };
}

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    id: 'ss-1',
    sessionId: 's-1',
    exerciseId: 'ex-1',
    setNumber: 1,
    reps: 12,
    weightKg: 80,
    completed: 1,
    notes: null,
    ...overrides,
  };
}

describe('sessionRepository', () => {
  it('insert + findRecent round-trips session', async () => {
    await sessionRepository.insert(makeSession(), [makeSet()]);
    const sessions = await sessionRepository.findRecent();
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('s-1');
    expect(sessions[0].durationSeconds).toBe(1000);
  });

  it('findRecent orders by startedAt desc, respects limit', async () => {
    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: 100 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: 300 }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: 200 }), []);

    const all = await sessionRepository.findRecent(10);
    expect(all.map(s => s.id)).toEqual(['s-2', 's-3', 's-1']);

    const limited = await sessionRepository.findRecent(2);
    expect(limited.map(s => s.id)).toEqual(['s-2', 's-3']);
  });

  it('insert with empty sets array works', async () => {
    await sessionRepository.insert(makeSession(), []);
    const sessions = await sessionRepository.findRecent();
    expect(sessions.length).toBe(1);
  });

  it('findByDateRange returns sessions within range ordered desc', async () => {
    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: 1_000_000 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: 2_000_000 }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: 3_000_000 }), []);

    const result = await sessionRepository.findByDateRange(1_500_000, 2_500_000);
    expect(result.map(s => s.id)).toEqual(['s-2']);

    const all = await sessionRepository.findByDateRange(0, 5_000_000);
    expect(all.map(s => s.id)).toEqual(['s-3', 's-2', 's-1']);
  });

  it('findDatesWithSessions returns distinct YYYY-MM-DD strings', async () => {
    const d1 = new Date('2026-03-15T10:00:00Z').getTime();
    const d1b = new Date('2026-03-15T20:00:00Z').getTime();
    const d2 = new Date('2026-03-20T05:00:00Z').getTime();

    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: d1 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: d1b }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: d2 }), []);

    const dates = await sessionRepository.findDatesWithSessions(
      new Date('2026-03-01').getTime(),
      new Date('2026-04-01').getTime(),
    );
    expect(dates.length).toBe(2);
    dates.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });
});
