import { runMigrations } from '@/database/migrations';
import { useBossStore } from '@/store/useBossStore';

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
              return { rows: db.prepare(sql).all(...(params ?? [])) };
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
  useBossStore.setState({ views: [], loaded: false });
});

describe('useBossStore', () => {
  it('load monta a view do chefão Pull-up com progresso zero', async () => {
    await useBossStore.getState().load();
    const views = useBossStore.getState().views;
    expect(views.length).toBe(1);
    expect(views[0].boss.id).toBe('boss_pull_up');
    expect(views[0].progressPoints).toBe(0);
    expect(views[0].progressions[0].locked).toBe(false);
  });

  it('setLevel persiste e recompõe a view', async () => {
    await useBossStore.getState().load();
    await useBossStore.getState().setLevel('pull_up_scapula', 1);
    const view = useBossStore.getState().getView('boss_pull_up');
    expect(view!.progressPoints).toBe(1);
    expect(view!.progressions[1].locked).toBe(false);
  });
});
