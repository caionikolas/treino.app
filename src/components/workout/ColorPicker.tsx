import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { WORKOUT_COLORS } from '@/constants/workoutColors';
import { colors, spacing, typography } from '@/theme';

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  palette?: readonly string[];
}

export function ColorPicker({ value, onChange, label, palette = WORKOUT_COLORS }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {palette.map(color => {
          const selected = color === value;
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              style={[styles.circle, { backgroundColor: color }, selected && styles.selected]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selected: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
});
