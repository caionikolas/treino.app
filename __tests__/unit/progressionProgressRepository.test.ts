import { runMigrations } from '@/database/migrations';
import { progressionProgressRepository } from '@/database/repositories/progressionProgressRepository';

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
          executeSync: (sql: string) => db.exec(sql),
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
  const { __resetDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
});

describe('progressionProgressRepository', () => {
  it('getAllLevels vazio quando nada salvo', async () => {
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels).toEqual({});
  });

  it('setLevel insere e getAllLevels devolve o nível', async () => {
    await progressionProgressRepository.setLevel('pull_up_scapula', 2);
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels.pull_up_scapula).toBe(2);
  });

  it('setLevel faz upsert (atualiza no conflito)', async () => {
    await progressionProgressRepository.setLevel('pull_up_scapula', 1);
    await progressionProgressRepository.setLevel('pull_up_scapula', 3);
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels.pull_up_scapula).toBe(3);
  });
});
