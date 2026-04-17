import { getDb } from './connection';

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
}
