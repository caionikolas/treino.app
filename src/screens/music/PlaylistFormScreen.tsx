import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, Pressable, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, EmptyState } from '@/components/common';
import { TrackRow } from '@/components/music';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { Track } from '@/types/music';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors, spacing, typography, radius } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'PlaylistForm'>;

export function PlaylistFormScreen({ route, navigation }: Props) {
  const mode = route.params.mode;
  const id = mode === 'edit' ? route.params.id : undefined;

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Track[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');

  const library = useMusicLibraryStore(s => s.tracks);
  const create = usePlaylistStore(s => s.create);
  const update = usePlaylistStore(s => s.update);
  const getDetail = usePlaylistStore(s => s.getDetail);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const result = await getDetail(id);
      if (result) {
        setName(result.playlist.name);
        const tracks = result.tracks
          .map(pt => {
            const existing = library.find(t => t.uri === pt.trackUri);
            return existing ?? {
              id: pt.id,
              uri: pt.trackUri,
              title: pt.trackName,
              artist: pt.artistName ?? '',
              album: '',
              durationMs: pt.durationMs ?? 0,
              artworkUri: null,
            };
          });
        setSelected(tracks);
      }
      setLoading(false);
    })();
  }, [mode, id, getDetail, library]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'create' ? 'Nova playlist' : 'Editar playlist',
    });
  }, [navigation, mode]);

  const openPicker = () => {
    navigation.navigate('MusicLibrary', {
      pickerMode: true,
      initialSelected: selected,
      onConfirm: (tracks: Track[]) => setSelected(tracks),
    });
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome obrigatório', 'Digite um nome pra playlist.');
      return;
    }
    if (mode === 'create') {
      await create(trimmed, selected);
    } else if (id) {
      await update(id, trimmed, selected);
    }
    navigation.goBack();
  };

  const removeTrack = (trackId: string) => {
    setSelected(prev => prev.filter(t => t.id !== trackId));
  };

  if (loading) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Treino pesado"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />

        <View style={styles.musicHeader}>
          <Text style={styles.label}>Músicas ({selected.length})</Text>
          <Pressable onPress={openPicker}>
            <Text style={styles.addLink}>+ Adicionar</Text>
          </Pressable>
        </View>
      </View>

      {selected.length === 0 ? (
        <EmptyState icon="add" title="Nenhuma música" subtitle="Toque em '+ Adicionar' pra escolher músicas." />
      ) : (
        <FlatList
          data={selected}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <View style={styles.trackRow}>
              <View style={{ flex: 1 }}>
                <TrackRow track={item} />
              </View>
              <Pressable onPress={() => removeTrack(item.id)} style={styles.removeBtn} hitSlop={8}>
                <Icon name="remove-circle-outline" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <Button label="Salvar" onPress={onSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.md, gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: colors.primaryLight,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  musicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  addLink: { ...typography.body, color: colors.accent, fontWeight: '600' },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: { paddingRight: spacing.md },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
