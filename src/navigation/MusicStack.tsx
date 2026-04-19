import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MusicLibraryScreen } from '@/screens/music/MusicLibraryScreen';
import { ArtistDetailScreen } from '@/screens/music/ArtistDetailScreen';
import { AlbumDetailScreen } from '@/screens/music/AlbumDetailScreen';
import { PlaylistListScreen } from '@/screens/music/PlaylistListScreen';
import { PlaylistDetailScreen } from '@/screens/music/PlaylistDetailScreen';
import { PlaylistFormScreen } from '@/screens/music/PlaylistFormScreen';
import { PlayerFullScreen } from '@/screens/music/PlayerFullScreen';
import { Track } from '@/types/music';
import { colors } from '@/theme';

export type MusicStackParamList = {
  MusicLibrary: {
    pickerMode?: boolean;
    initialSelected?: Track[];
    onConfirm?: (tracks: Track[]) => void;
  } | undefined;
  ArtistDetail: { artist: string };
  AlbumDetail: { album: string; artist: string };
  PlaylistList: undefined;
  PlaylistDetail: { id: string };
  PlaylistForm: { mode: 'create' } | { mode: 'edit'; id: string };
  PlayerFull: undefined;
};

const Stack = createNativeStackNavigator<MusicStackParamList>();

export function MusicStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="MusicLibrary"
        component={MusicLibraryScreen}
        options={{ title: 'Música' }}
      />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} options={{ title: 'Artista' }} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} options={{ title: 'Álbum' }} />
      <Stack.Screen name="PlaylistList" component={PlaylistListScreen} options={{ title: 'Playlists' }} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} options={{ title: 'Playlist' }} />
      <Stack.Screen name="PlaylistForm" component={PlaylistFormScreen} options={{ title: 'Playlist' }} />
      <Stack.Screen
        name="PlayerFull"
        component={PlayerFullScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
