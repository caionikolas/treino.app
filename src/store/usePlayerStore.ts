import { create } from 'zustand';
import { RepeatMode, Track } from '@/types/music';
import { musicService } from '@/services/musicService';

interface PlayerState {
  currentTrack: Track | null;
  queueIndex: number;
  queueLength: number;
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  _listenersAttached: boolean;

  initListeners: () => void;
  playQueue: (tracks: Track[], startIndex: number) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seekTo: (ms: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  stop: () => void;
}

const repeatCycle: RepeatMode[] = ['off', 'one', 'all'];

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queueIndex: 0,
  queueLength: 0,
  playing: false,
  shuffle: false,
  repeat: 'off',
  _listenersAttached: false,

  initListeners: () => {
    if (get()._listenersAttached) return;
    musicService.onTrackChanged(event => {
      if (!event) {
        set({ currentTrack: null, queueIndex: 0, queueLength: 0 });
        return;
      }
      const track: Track = {
        id: event.id,
        uri: event.uri,
        title: event.title,
        artist: event.artist,
        album: event.album,
        durationMs: event.durationMs,
        artworkUri: event.artworkUri,
      };
      set({ currentTrack: track, queueIndex: event.queueIndex, queueLength: event.queueLength });
    });
    musicService.onStateChanged(event => {
      set({
        playing: event.playing,
        shuffle: event.shuffle,
        repeat: event.repeat,
        queueIndex: event.queueIndex,
        queueLength: event.queueLength,
      });
    });
    set({ _listenersAttached: true });
  },

  playQueue: async (tracks, startIndex) => {
    if (tracks.length === 0) return;
    await musicService.setQueue(tracks, startIndex);
  },

  play: () => musicService.play(),
  pause: () => musicService.pause(),
  togglePlayPause: () => {
    if (get().playing) musicService.pause();
    else musicService.play();
  },
  skipNext: () => musicService.next(),
  skipPrevious: () => musicService.previous(),
  seekTo: ms => musicService.seekTo(ms),

  toggleShuffle: () => {
    const next = !get().shuffle;
    musicService.setShuffle(next);
    set({ shuffle: next });
  },

  toggleRepeat: () => {
    const current = get().repeat;
    const i = repeatCycle.indexOf(current);
    const next = repeatCycle[(i + 1) % repeatCycle.length];
    musicService.setRepeat(next);
    set({ repeat: next });
  },

  stop: () => {
    musicService.stop();
    set({ currentTrack: null, playing: false });
  },
}));
