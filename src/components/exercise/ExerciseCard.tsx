import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
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
          <Image
            source={require('../../../assets/examples/weight1.png')}
            style={styles.thumbnailImage}
            resizeMode="contain"
          />
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
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 60,
    height: 60,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.heading, color: colors.textPrimary },
  group: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
