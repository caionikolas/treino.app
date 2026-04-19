import { create } from 'zustand';
import { Playlist, PlaylistTrack, PlaylistWithCount, Track } from '@/types/music';
import { playlistRepository } from '@/database/repositories/playlistRepository';
import { generateId } from '@/utils/generateId';

interface PlaylistState {
  summaries: PlaylistWithCount[];
  loaded: boolean;

  load: () => Promise<void>;
  create: (name: string, tracks: Track[]) => Promise<string>;
  update: (id: string, name: string, tracks: Track[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getDetail: (id: string) => Promise<{ playlist: Playlist; tracks: PlaylistTrack[] } | null>;
}

function tracksToPlaylistTracks(playlistId: string, tracks: Track[]): PlaylistTrack[] {
  return tracks.map((t, i) => ({
    id: generateId(),
    playlistId,
    trackUri: t.uri,
    trackName: t.title,
    artistName: t.artist,
    durationMs: t.durationMs,
    orderIndex: i,
  }));
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  summaries: [],
  loaded: false,

  load: async () => {
    const summaries = await playlistRepository.findAll();
    set({ summaries, loaded: true });
  },

  create: async (name, tracks) => {
    const id = generateId();
    const playlist: Playlist = { id, name, createdAt: Date.now() };
    await playlistRepository.insert(playlist, tracksToPlaylistTracks(id, tracks));
    await get().load();
    return id;
  },

  update: async (id, name, tracks) => {
    const existing = await playlistRepository.findById(id);
    if (!existing) return;
    const updated: Playlist = { ...existing.playlist, name };
    await playlistRepository.update(id, updated, tracksToPlaylistTracks(id, tracks));
    await get().load();
  },

  remove: async id => {
    await playlistRepository.delete(id);
    await get().load();
  },

  getDetail: id => playlistRepository.findById(id),
}));
