import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUPS, MuscleGroupKey } from '@/constants/muscleGroups';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  value: MuscleGroupKey | 'all';
  onChange: (v: MuscleGroupKey | 'all') => void;
}

export function MuscleGroupFilter({ value, onChange }: Props) {
  const options: Array<{ key: MuscleGroupKey | 'all'; label: string }> = [
    { key: 'all', label: 'Todos' },
    ...MUSCLE_GROUP_ORDER.map(k => ({ key: k, label: MUSCLE_GROUPS[k] })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.accent },
  label: { ...typography.caption, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary, fontWeight: '600' },
});
