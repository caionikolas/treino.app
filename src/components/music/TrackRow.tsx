import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Track } from '@/types/music';
import { colors, spacing, typography } from '@/theme';

interface Props {
  track: Track;
  onPress?: () => void;
  selected?: boolean;
  selectable?: boolean;
  playing?: boolean;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TrackRow({ track, onPress, selected, selectable, playing }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {track.artworkUri ? (
        <Image source={{ uri: track.artworkUri }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Icon name="music-note" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, playing && styles.playing]}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}
        </Text>
      </View>
      {selectable ? (
        <Icon
          name={selected ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={selected ? colors.accent : colors.textSecondary}
        />
      ) : (
        <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.primaryLight },
  art: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.primaryLight },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  playing: { color: colors.accent },
  artist: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  duration: { ...typography.caption, color: colors.textSecondary },
});
