import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from '@/components/common';
import { Exercise } from '@/types/exercise';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  exercise: Exercise;
  onPress: () => void;
}

export function ExerciseCard({ exercise, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.thumbnail}>
          <Icon name="fitness-center" size={32} color={colors.textSecondary} />
        </View>
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
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.heading, color: colors.textPrimary },
  group: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
