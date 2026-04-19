import { getDb } from '../connection';
import { Playlist, PlaylistTrack, PlaylistWithCount } from '@/types/music';

interface PlaylistRow {
  id: string;
  name: string;
  created_at: number;
}

interface PlaylistTrackRow {
  id: string;
  playlist_id: string;
  track_uri: string;
  track_name: string;
  artist_name: string | null;
  duration_ms: number | null;
  order_index: number;
}

interface PlaylistSummaryRow {
  id: string;
  name: string;
  created_at: number;
  track_count: number;
}

function rowToTrack(row: PlaylistTrackRow): PlaylistTrack {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    trackUri: row.track_uri,
    trackName: row.track_name,
    artistName: row.artist_name,
    durationMs: row.duration_ms,
    orderIndex: row.order_index,
  };
}

export const playlistRepository = {
  async findAll(): Promise<PlaylistWithCount[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT p.id, p.name, p.created_at, COUNT(pt.id) AS track_count
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
    );
    return (result.rows ?? []).map(r => {
      const row = r as unknown as PlaylistSummaryRow;
      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        trackCount: typeof row.track_count === 'number' ? row.track_count : 0,
      };
    });
  },

  async findById(id: string): Promise<{ playlist: Playlist; tracks: PlaylistTrack[] } | null> {
    const db = getDb();
    const pResult = await db.execute('SELECT * FROM playlists WHERE id = ? LIMIT 1', [id]);
    const pRow = pResult.rows?.[0] as unknown as PlaylistRow | undefined;
    if (!pRow) return null;

    const tResult = await db.execute(
      'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY order_index ASC',
      [id],
    );
    const tracks = (tResult.rows ?? []).map(r => rowToTrack(r as unknown as PlaylistTrackRow));
    return {
      playlist: { id: pRow.id, name: pRow.name, createdAt: pRow.created_at },
      tracks,
    };
  },

  async insert(playlist: Playlist, tracks: PlaylistTrack[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        'INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)',
        [playlist.id, playlist.name, playlist.createdAt],
      );
      for (const t of tracks) {
        await tx.execute(
          `INSERT INTO playlist_tracks
             (id, playlist_id, track_uri, track_name, artist_name, duration_ms, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [t.id, playlist.id, t.trackUri, t.trackName, t.artistName, t.durationMs, t.orderIndex],
        );
      }
    });
  },

  async update(id: string, playlist: Playlist, tracks: PlaylistTrack[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute('UPDATE playlists SET name = ? WHERE id = ?', [playlist.name, id]);
      await tx.execute('DELETE FROM playlist_tracks WHERE playlist_id = ?', [id]);
      for (const t of tracks) {
        await tx.execute(
          `INSERT INTO playlist_tracks
             (id, playlist_id, track_uri, track_name, artist_name, duration_ms, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [t.id, id, t.trackUri, t.trackName, t.artistName, t.durationMs, t.orderIndex],
        );
      }
    });
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM playlists WHERE id = ?', [id]);
  },
};
