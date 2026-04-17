import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/common';
import { ExerciseMedia } from './ExerciseMedia';
import { Exercise } from '@/types/exercise';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exercise: Exercise;
  onPress: () => void;
}

export function ExerciseCard({ exercise, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <ExerciseMedia filename={exercise.mediaFilename} paused style={styles.media} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{exercise.name}</Text>
          <Text style={styles.group}>{labelForMuscleGroup(exercise.muscleGroup)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  media: { width: 72, height: 72 },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.heading, color: colors.textPrimary },
  group: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
