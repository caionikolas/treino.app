export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  artworkUri: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackUri: string;
  trackName: string;
  artistName: string | null;
  durationMs: number | null;
  orderIndex: number;
}

export interface PlaylistWithCount {
  id: string;
  name: string;
  trackCount: number;
  createdAt: number;
}

export type RepeatMode = 'off' | 'one' | 'all';
