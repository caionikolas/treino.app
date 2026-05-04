import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WorkoutSummary } from '@/types/workout';
import { FavoriteButton } from './FavoriteButton';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  workout: WorkoutSummary;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress, onToggleFavorite }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: workout.color }]}>
        <Icon name="fitness-center" size={28} color="#FFFFFF" />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{workout.name}</Text>
        <View style={styles.metaRow}>
          <Icon name="format-list-numbered" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
          </Text>
        </View>
      </View>

      <FavoriteButton isFavorite={workout.isFavorite} onToggle={onToggleFavorite} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { ...typography.heading, color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.textSecondary, fontSize: 13 },
});
