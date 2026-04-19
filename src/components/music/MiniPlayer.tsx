import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usePlayerStore } from '@/store/usePlayerStore';
import { colors, spacing, typography } from '@/theme';

interface Props {
  onPress?: () => void;
}

export function MiniPlayer({ onPress }: Props) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const playing = usePlayerStore(s => s.playing);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const skipNext = usePlayerStore(s => s.skipNext);

  if (!currentTrack) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {currentTrack.artworkUri ? (
        <Image source={{ uri: currentTrack.artworkUri }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Icon name="music-note" size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.title}>
          {currentTrack.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {currentTrack.artist}
        </Text>
      </View>
      <Pressable hitSlop={8} onPress={togglePlayPause} style={styles.btn}>
        <Icon name={playing ? 'pause' : 'play-arrow'} size={32} color={colors.textPrimary} />
      </Pressable>
      <Pressable hitSlop={8} onPress={skipNext} style={styles.btn}>
        <Icon name="skip-next" size={28} color={colors.textPrimary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  art: { width: 40, height: 40, borderRadius: 4, backgroundColor: colors.primary },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  artist: { ...typography.caption, color: colors.textSecondary },
  btn: { padding: spacing.xs },
});
