import React, { useMemo, useLayoutEffect } from 'react';
import { StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TrackRow, MiniPlayer } from '@/components/music';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'AlbumDetail'>;

export function AlbumDetailScreen({ route, navigation }: Props) {
  const { album, artist } = route.params;
  const tracks = useMusicLibraryStore(s => s.tracks);
  const playQueue = usePlayerStore(s => s.playQueue);
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);

  const filtered = useMemo(
    () => tracks.filter(t => t.album === album && t.artist === artist),
    [tracks, album, artist],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: album || '(sem álbum)' });
  }, [navigation, album]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            onPress={() => playQueue(filtered, index)}
            playing={item.id === currentTrackId}
          />
        )}
      />
      <MiniPlayer onPress={() => navigation.navigate('PlayerFull')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
