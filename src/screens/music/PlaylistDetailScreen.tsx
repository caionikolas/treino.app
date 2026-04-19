import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Pressable, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button, EmptyState } from '@/components/common';
import { TrackRow, MiniPlayer } from '@/components/music';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Playlist, PlaylistTrack, Track } from '@/types/music';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'PlaylistDetail'>;

function playlistTrackToTrack(pt: PlaylistTrack, library: Track[]): Track | null {
  const existing = library.find(t => t.uri === pt.trackUri);
  if (existing) return existing;
  return {
    id: pt.id,
    uri: pt.trackUri,
    title: pt.trackName,
    artist: pt.artistName ?? '',
    album: '',
    durationMs: pt.durationMs ?? 0,
    artworkUri: null,
  };
}

export function PlaylistDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);

  const library = useMusicLibraryStore(s => s.tracks);
  const getDetail = usePlaylistStore(s => s.getDetail);
  const remove = usePlaylistStore(s => s.remove);
  const playQueue = usePlayerStore(s => s.playQueue);

  const load = useCallback(async () => {
    const result = await getDetail(id);
    if (result) {
      setPlaylist(result.playlist);
      setTracks(result.tracks);
    }
  }, [id, getDetail]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: playlist?.name ?? 'Playlist',
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            onPress={() => navigation.navigate('PlaylistForm', { mode: 'edit', id })}
            style={styles.headerBtn}
          >
            <Icon name="edit" size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={confirmDelete} style={styles.headerBtn}>
            <Icon name="delete-outline" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, playlist, id]);

  const confirmDelete = () => {
    Alert.alert('Excluir playlist?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
          navigation.goBack();
        },
      },
    ]);
  };

  const playAll = () => {
    const mapped = tracks.map(pt => playlistTrackToTrack(pt, library)).filter(Boolean) as Track[];
    if (mapped.length > 0) playQueue(mapped, 0);
  };

  const playAt = (index: number) => {
    const mapped = tracks.map(pt => playlistTrackToTrack(pt, library)).filter(Boolean) as Track[];
    if (mapped.length > 0) playQueue(mapped, index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {tracks.length} música{tracks.length !== 1 ? 's' : ''}
        </Text>
        <Button
          label="▶ Reproduzir"
          onPress={playAll}
          disabled={tracks.length === 0}
          style={styles.playBtn}
        />
      </View>

      {tracks.length === 0 ? (
        <EmptyState icon="music-off" title="Playlist vazia" subtitle="Edite a playlist pra adicionar músicas." />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={pt => pt.id}
          renderItem={({ item, index }) => {
            const t = playlistTrackToTrack(item, library);
            if (!t) return null;
            return <TrackRow track={t} onPress={() => playAt(index)} />;
          }}
        />
      )}

      <MiniPlayer onPress={() => navigation.navigate('PlayerFull')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm },
  count: { ...typography.caption, color: colors.textSecondary },
  playBtn: {},
  headerBtn: { paddingHorizontal: spacing.sm },
});
