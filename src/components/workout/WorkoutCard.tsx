import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { WorkoutSummary } from '@/types/workout';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  workout: WorkoutSummary;
  onPress: () => void;
  onLongPress: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: workout.color },
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Text style={styles.name} numberOfLines={2}>{workout.name}</Text>
        <Text style={styles.subtitle}>
          {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  name: { ...typography.heading, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { ...typography.caption, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs },
});
