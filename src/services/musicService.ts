import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';
import { Track, RepeatMode } from '@/types/music';

interface MusicNative {
  queryAudio(): Promise<Track[]>;
  setQueue(tracks: Track[], startIndex: number): Promise<void>;
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  seekTo(positionMs: number): void;
  setShuffle(enabled: boolean): void;
  setRepeat(mode: RepeatMode): void;
  getPosition(): Promise<number>;
  stop(): void;
}

const nativeModule = NativeModules.MusicModule as MusicNative | undefined;

function assertModule(): MusicNative {
  if (!nativeModule) {
    throw new Error('MusicModule não está disponível. Rebuild o app nativo.');
  }
  return nativeModule;
}

const emitter = nativeModule ? new NativeEventEmitter(NativeModules.MusicModule) : null;

export interface TrackChangedEvent {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  artworkUri: string | null;
  queueIndex: number;
  queueLength: number;
}

export interface StateChangedEvent {
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queueIndex: number;
  queueLength: number;
}

export const musicService = {
  queryAudio: () => assertModule().queryAudio(),
  setQueue: (tracks: Track[], startIndex: number) => assertModule().setQueue(tracks, startIndex),
  play: () => assertModule().play(),
  pause: () => assertModule().pause(),
  next: () => assertModule().next(),
  previous: () => assertModule().previous(),
  seekTo: (positionMs: number) => assertModule().seekTo(positionMs),
  setShuffle: (enabled: boolean) => assertModule().setShuffle(enabled),
  setRepeat: (mode: RepeatMode) => assertModule().setRepeat(mode),
  getPosition: () => assertModule().getPosition(),
  stop: () => assertModule().stop(),

  onTrackChanged(listener: (event: TrackChangedEvent | null) => void): EmitterSubscription | null {
    return emitter?.addListener('onTrackChanged', listener) ?? null;
  },
  onStateChanged(listener: (event: StateChangedEvent) => void): EmitterSubscription | null {
    return emitter?.addListener('onStateChanged', listener) ?? null;
  },
  onError(listener: (event: { message: string }) => void): EmitterSubscription | null {
    return emitter?.addListener('onError', listener) ?? null;
  },
};
