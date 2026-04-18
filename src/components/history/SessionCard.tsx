import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { SessionWithMeta } from '@/types/history';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  item: SessionWithMeta;
  onPress: () => void;
}

function formatHhMm(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const mm = Math.floor(seconds / 60);
  return mm > 0 ? `${mm} min` : `${seconds}s`;
}

export function SessionCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.bar, { backgroundColor: item.workoutColor }]} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.workoutName}</Text>
        <Text style={styles.sub}>
          {formatHhMm(item.session.startedAt)} • {formatDuration(item.session.durationSeconds)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  bar: { width: 6 },
  body: { flex: 1, padding: spacing.md },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
