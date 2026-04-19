import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, Pressable, Linking, TextInput, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TrackRow, MiniPlayer } from '@/components/music';
import { Button, EmptyState } from '@/components/common';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Track } from '@/types/music';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors, spacing, typography, radius } from '@/theme';

type Mode = 'all' | 'artists' | 'albums';
type Props = NativeStackScreenProps<MusicStackParamList, 'MusicLibrary'>;

export function MusicLibraryScreen({ route, navigation }: Props) {
  const pickerMode = route.params?.pickerMode ?? false;
  const initialSelected = route.params?.initialSelected ?? [];
  const onConfirm = route.params?.onConfirm;

  const tracks = useMusicLibraryStore(s => s.tracks);
  const permission = useMusicLibraryStore(s => s.permission);
  const loading = useMusicLibraryStore(s => s.loading);
  const loadLibrary = useMusicLibraryStore(s => s.loadLibrary);

  const playQueue = usePlayerStore(s => s.playQueue);
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);

  const [mode, setMode] = useState<Mode>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Track[]>(initialSelected);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filtered = useMemo(() => {
    if (!search) return tracks;
    const q = search.toLowerCase();
    return tracks.filter(
      t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    );
  }, [tracks, search]);

  const artists = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(t => map.set(t.artist, (map.get(t.artist) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const albums = useMemo(() => {
    const map = new Map<string, { artist: string; count: number; artworkUri: string | null }>();
    filtered.forEach(t => {
      const key = `${t.album}||${t.artist}`;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { artist: t.artist, count: 1, artworkUri: t.artworkUri });
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ album: key.split('||')[0], artist: v.artist, count: v.count, artworkUri: v.artworkUri }))
      .sort((a, b) => a.album.localeCompare(b.album));
  }, [filtered]);

  const toggleSelect = (t: Track) => {
    setSelected(prev =>
      prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t],
    );
  };

  const onTrackPress = (t: Track) => {
    if (pickerMode) {
      toggleSelect(t);
    } else {
      playQueue(filtered, filtered.findIndex(x => x.id === t.id));
    }
  };

  const onConfirmSelection = () => {
    onConfirm?.(selected);
    navigation.goBack();
  };

  useLayoutEffect(() => {
    if (pickerMode) {
      navigation.setOptions({
        title: 'Selecionar músicas',
        headerRight: () => (
          <Pressable onPress={onConfirmSelection} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Adicionar ({selected.length})</Text>
          </Pressable>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerMode, selected]);

  if (permission === 'denied') {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="block"
          title="Permissão de música negada"
          subtitle="Abra as configurações do app pra permitir acesso à biblioteca."
        />
        <View style={{ padding: spacing.md }}>
          <Button label="Abrir configurações" onPress={() => Linking.openSettings()} />
          <View style={{ height: spacing.sm }} />
          <Button label="Tentar novamente" variant="secondary" onPress={loadLibrary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && tracks.length === 0 && permission === 'granted') {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="music-off"
          title="Nenhuma música encontrada"
          subtitle="Adicione arquivos de música ao celular e volte aqui."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!pickerMode && (
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.navigate('PlaylistList')} style={styles.tab}>
            <Icon name="queue-music" size={20} color={colors.textSecondary} />
            <Text style={styles.tabText}>Playlists</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchRow}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.toggle}>
        {(['all', 'artists', 'albums'] as Mode[]).map(m => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === 'all' ? 'Tudo' : m === 'artists' ? 'Artistas' : 'Álbuns'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'all' && (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              onPress={() => onTrackPress(item)}
              selectable={pickerMode}
              selected={!!selected.find(x => x.id === item.id)}
              playing={item.id === currentTrackId}
            />
          )}
          ListEmptyComponent={loading ? <Text style={styles.loading}>Carregando...</Text> : null}
        />
      )}

      {mode === 'artists' && (
        <FlatList
          data={artists}
          keyExtractor={a => a.name}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}
              onPress={() => navigation.navigate('ArtistDetail', { artist: item.name })}
            >
              <Icon name="person" size={24} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupSub}>{item.count} música{item.count !== 1 ? 's' : ''}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      )}

      {mode === 'albums' && (
        <FlatList
          data={albums}
          keyExtractor={a => `${a.album}-${a.artist}`}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}
              onPress={() => navigation.navigate('AlbumDetail', { album: item.album, artist: item.artist })}
            >
              <Icon name="album" size={24} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{item.album || '(sem álbum)'}</Text>
                <Text style={styles.groupSub}>{item.artist} • {item.count} música{item.count !== 1 ? 's' : ''}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      )}

      {!pickerMode && <MiniPlayer onPress={() => navigation.navigate('PlayerFull')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  tabText: { ...typography.body, color: colors.textSecondary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, paddingVertical: spacing.sm },
  toggle: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginVertical: spacing.sm,
    backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 2,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  toggleBtnActive: { backgroundColor: colors.accent },
  toggleText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: colors.textPrimary },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  pressed: { backgroundColor: colors.primaryLight },
  groupName: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  groupSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  loading: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
  headerBtn: { paddingHorizontal: spacing.md },
  headerBtnText: { ...typography.body, color: colors.accent, fontWeight: '600' },
});
