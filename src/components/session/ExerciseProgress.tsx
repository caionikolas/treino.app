import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  targetReps: string;
}

export function ExerciseProgress({ exerciseName, currentSet, totalSets, targetReps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={2}>{exerciseName}</Text>
      <Text style={styles.detail}>
        Série {currentSet} de {totalSets} • alvo: {targetReps} reps
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: spacing.md },
  name: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  detail: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});
