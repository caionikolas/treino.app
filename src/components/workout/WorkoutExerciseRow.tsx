import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from '@/components/common';
import { DraftExercise } from '@/types/workout';
import { colors, spacing, typography } from '@/theme';

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
  return `${e.sets}x${e.reps} • ${e.restSeconds}s`;
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
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{exercise.exerciseName}</Text>
          <Text style={styles.summary}>{summaryText(exercise)}</Text>
        </View>
        <View style={styles.actions}>
          <IconBtn name="arrow-upward" onPress={onMoveUp} disabled={isFirst} />
          <IconBtn name="arrow-downward" onPress={onMoveDown} disabled={isLast} />
          <IconBtn name="edit" onPress={onEdit} />
          <IconBtn name="delete-outline" onPress={onRemove} />
        </View>
      </View>
    </Card>
  );
}

function IconBtn({
  name,
  onPress,
  disabled,
}: {
  name: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.iconBtn, pressed && !disabled && styles.iconBtnPressed]}
    >
      <Icon name={name} size={24} color={disabled ? colors.border : colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, paddingLeft: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  summary: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { opacity: 0.6 },
});
