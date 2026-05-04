import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DraftExercise } from '@/types/workout';
import { colors, spacing, typography, radius } from '@/theme';

interface Props {
  exercise: DraftExercise;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function summaryText(e: DraftExercise): string {
  const sets = e.repsPerSet.length;
  const reps = e.repsPerSet.join('-') || '0';
  return `${sets}x${reps} · ${e.restSeconds}s`;
}

export function WorkoutExerciseRow({
  exercise,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
}: Props) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <View style={styles.row}>
      <View style={styles.reorderCol}>
        <Pressable
          onPress={onMoveUp}
          disabled={isFirst}
          style={({ pressed }) => [styles.reorderBtn, pressed && !isFirst && styles.pressed]}
        >
          <Icon name="keyboard-arrow-up" size={20} color={isFirst ? colors.border : colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={isLast}
          style={({ pressed }) => [styles.reorderBtn, pressed && !isLast && styles.pressed]}
        >
          <Icon name="keyboard-arrow-down" size={20} color={isLast ? colors.border : colors.textSecondary} />
        </Pressable>
      </View>

      <Pressable onPress={onEdit} style={styles.thumb}>
        <Icon name="fitness-center" size={22} color={colors.textPrimary} />
      </Pressable>

      <Pressable onPress={onEdit} style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{exercise.exerciseName}</Text>
        <Text style={styles.summary}>{summaryText(exercise)}</Text>
      </Pressable>

      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
      >
        <Icon name="close" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  reorderCol: { alignItems: 'center', justifyContent: 'center' },
  reorderBtn: { width: 28, height: 20, alignItems: 'center', justifyContent: 'center' },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  summary: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E94560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
