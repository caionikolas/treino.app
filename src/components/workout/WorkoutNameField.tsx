import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  color?: string;
}

export function WorkoutNameField({ label, value, onChangeText, placeholder, color }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, color ? { color } : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
});
