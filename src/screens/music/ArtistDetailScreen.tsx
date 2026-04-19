import React, { useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TrackRow, MiniPlayer } from '@/components/music';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'ArtistDetail'>;

export function ArtistDetailScreen({ route, navigation }: Props) {
  const { artist } = route.params;
  const tracks = useMusicLibraryStore(s => s.tracks);
  const playQueue = usePlayerStore(s => s.playQueue);
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);

  const filtered = useMemo(() => tracks.filter(t => t.artist === artist), [tracks, artist]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: artist });
  }, [navigation, artist]);

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
