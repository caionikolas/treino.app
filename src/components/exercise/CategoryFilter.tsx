import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { CATEGORIES, CategoryKey } from '@/constants/categories';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  value: CategoryKey | 'all';
  onChange: (v: CategoryKey | 'all') => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  const options: Array<{ key: CategoryKey | 'all'; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'strength', label: CATEGORIES.strength },
    { key: 'calisthenics', label: CATEGORIES.calisthenics },
  ];
  return (
    <View style={styles.row}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: colors.accentSecondary },
  label: { ...typography.caption, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary, fontWeight: '600' },
});
