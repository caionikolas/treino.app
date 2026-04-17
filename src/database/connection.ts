import { open, type DB } from '@op-engineering/op-sqlite';

let dbInstance: DB | null = null;

export function getDb(): DB {
  if (!dbInstance) {
    dbInstance = open({ name: 'treino.db' });
    dbInstance.executeSync('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
