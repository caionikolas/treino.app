import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerControls } from '@/components/music';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useIntervalTimer } from '@/hooks/useIntervalTimer';
import { musicService } from '@/services/musicService';
import { MusicStackParamList } from '@/navigation/MusicStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<MusicStackParamList, 'PlayerFull'>;

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PlayerFullScreen({ navigation }: Props) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const queueIndex = usePlayerStore(s => s.queueIndex);
  const queueLength = usePlayerStore(s => s.queueLength);
  const [position, setPosition] = useState(0);

  useIntervalTimer(500, async () => {
    const p = await musicService.getPosition();
    setPosition(p);
  }, true);

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Nada tocando</Text>
      </SafeAreaView>
    );
  }

  const progress = currentTrack.durationMs > 0
    ? Math.min(1, position / currentTrack.durationMs) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="keyboard-arrow-down" size={32} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {queueIndex + 1} / {queueLength}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.artContainer}>
        {currentTrack.artworkUri ? (
          <Image source={{ uri: currentTrack.artworkUri }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]}>
            <Icon name="music-note" size={96} color={colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.title}>{currentTrack.title}</Text>
        <Text numberOfLines={1} style={styles.artist}>{currentTrack.artist}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.times}>
          <Text style={styles.time}>{fmt(position)}</Text>
          <Text style={styles.time}>{fmt(currentTrack.durationMs)}</Text>
        </View>
      </View>

      <PlayerControls />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTitle: { ...typography.caption, color: colors.textSecondary },
  artContainer: { alignItems: 'center', padding: spacing.xl },
  art: { width: 280, height: 280, borderRadius: 12, backgroundColor: colors.primaryLight },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.xs },
  title: { ...typography.heading, color: colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  artist: { ...typography.body, color: colors.textSecondary },
  progressContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.xs },
  progressBar: { height: 4, backgroundColor: colors.primaryLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { ...typography.caption, color: colors.textSecondary },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
});
