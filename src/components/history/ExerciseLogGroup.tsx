import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from '@/components/common';
import { SessionSet } from '@/types/session';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exerciseName: string;
  muscleGroup: string;
  sets: SessionSet[];
}

function formatSet(set: SessionSet): string {
  const w = set.weightKg == null ? '' : `@${set.weightKg}kg`;
  return `${set.reps}${w}`;
}

export function ExerciseLogGroup({ exerciseName, muscleGroup, sets }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{exerciseName}</Text>
        {muscleGroup ? <Badge label={labelForMuscleGroup(muscleGroup)} /> : null}
      </View>
      <Text style={styles.sets}>
        {sets.map(formatSet).join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  sets: { ...typography.body, color: colors.textSecondary },
});
