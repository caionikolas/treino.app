import { getDb } from './connection';
import { parseRepsToArray } from '@/utils/parseRepsToArray';

interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        category TEXT NOT NULL,
        media_filename TEXT,
        instructions TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        order_index INTEGER NOT NULL,
        sets INTEGER NOT NULL,
        reps TEXT NOT NULL,
        rest_seconds INTEGER NOT NULL,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        duration_seconds INTEGER,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS session_sets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight_kg REAL,
        completed INTEGER NOT NULL DEFAULT 1,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS playlist_tracks (
        id TEXT PRIMARY KEY,
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        track_uri TEXT NOT NULL,
        track_name TEXT NOT NULL,
        artist_name TEXT,
        duration_ms INTEGER,
        order_index INTEGER NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    up: [
      `ALTER TABLE workouts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
    ],
  },
  {
    version: 3,
    up: [
      `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        frequency TEXT NOT NULL,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_time TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        current_index INTEGER NOT NULL DEFAULT 0,
        started_at INTEGER,
        completed_at INTEGER,
        last_advanced_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS plan_workouts (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        order_index INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_plan_workouts_plan ON plan_workouts(plan_id, order_index)`,
    ],
  },
  {
    version: 4,
    up: [
      `ALTER TABLE workouts ADD COLUMN default_sets INTEGER NOT NULL DEFAULT 3`,
      `ALTER TABLE workouts ADD COLUMN default_rest_seconds INTEGER NOT NULL DEFAULT 90`,
      `ALTER TABLE workout_exercises ADD COLUMN reps_per_set TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE workout_exercises ADD COLUMN warmup_enabled INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE workout_exercises ADD COLUMN warmup_reps INTEGER`,
      `ALTER TABLE workout_exercises ADD COLUMN rest_enabled INTEGER NOT NULL DEFAULT 1`,
    ],
  },
  {
    version: 5,
    up: [
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 6,
    up: [
      `CREATE TABLE IF NOT EXISTS progression_progress (
        progression_id TEXT PRIMARY KEY,
        mastery_level INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`,
    ],
  },
  {
    version: 7,
    up: [
      `DROP TABLE IF EXISTS plan_workouts`,
      `DROP TABLE IF EXISTS plans`,
    ],
  },
];

async function getCurrentVersion(): Promise<number> {
  const db = getDb();
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`,
  );
  const result = await db.execute('SELECT MAX(version) as v FROM schema_migrations');
  const row = result.rows?.[0];
  const v = row?.v;
  return typeof v === 'number' ? v : 0;
}

async function backfillRepsPerSet(): Promise<void> {
  const db = getDb();
  const result = await db.execute(
    `SELECT id, sets, reps FROM workout_exercises WHERE reps_per_set = '[]' OR reps_per_set IS NULL`,
  );
  const rows = (result.rows ?? []) as Array<{ id: string; sets: number; reps: string }>;
  for (const row of rows) {
    const arr = parseRepsToArray(row.reps, row.sets);
    await db.execute(
      'UPDATE workout_exercises SET reps_per_set = ? WHERE id = ?',
      [JSON.stringify(arr), row.id],
    );
  }
}

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const current = await getCurrentVersion();
  const pending = MIGRATIONS.filter(m => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.transaction(async tx => {
      for (const stmt of migration.up) {
        await tx.execute(stmt);
      }
      await tx.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        Date.now(),
      ]);
    });
    console.log(`Applied migration v${migration.version}`);
  }

  await backfillRepsPerSet();
}
