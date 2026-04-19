import { create } from 'zustand';
import { PermissionsAndroid, Platform } from 'react-native';
import { Track } from '@/types/music';
import { musicService } from '@/services/musicService';

export type PermissionStatus = 'unknown' | 'granted' | 'denied';

interface MusicLibraryState {
  tracks: Track[];
  permission: PermissionStatus;
  loading: boolean;
  error: string | null;

  requestPermission: () => Promise<boolean>;
  loadLibrary: () => Promise<void>;
}

async function askPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const version = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
  const permission = version >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const already = await PermissionsAndroid.check(permission);
  if (already) return true;

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export const useMusicLibraryStore = create<MusicLibraryState>((set, get) => ({
  tracks: [],
  permission: 'unknown',
  loading: false,
  error: null,

  requestPermission: async () => {
    const granted = await askPermission();
    set({ permission: granted ? 'granted' : 'denied' });
    return granted;
  },

  loadLibrary: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const granted = await askPermission();
      if (!granted) {
        set({ permission: 'denied', loading: false, tracks: [] });
        return;
      }
      const tracks = await musicService.queryAudio();
      set({ permission: 'granted', tracks, loading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao carregar biblioteca';
      set({ error: message, loading: false });
    }
  },
}));
