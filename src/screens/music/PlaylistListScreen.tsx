import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, EmptyState } from '@/components/common';
import { MiniPlayer } from '@/components/music';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'PlaylistList'>;

export function PlaylistListScreen({ navigation }: Props) {
  const summaries = usePlaylistStore(s => s.summaries);
  const loaded = usePlaylistStore(s => s.loaded);
  const load = usePlaylistStore(s => s.load);

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('PlaylistForm', { mode: 'create' })}
          style={styles.headerBtn}
        >
          <Icon name="add" size={28} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {loaded && summaries.length === 0 ? (
        <EmptyState
          icon="queue-music"
          title="Nenhuma playlist"
          subtitle="Crie uma playlist pra tocar durante o treino."
        />
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
            >
              <Card style={styles.card}>
                <Icon name="queue-music" size={28} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>
                    {item.trackCount} música{item.trackCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </Card>
            </Pressable>
          )}
        />
      )}
      <MiniPlayer onPress={() => navigation.navigate('PlayerFull')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBtn: { paddingHorizontal: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
