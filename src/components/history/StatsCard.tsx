import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  label: string;
  value: string;
}

export function StatsCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  value: { ...typography.title, color: colors.accent, fontSize: 32, fontWeight: '700' },
  label: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
});
