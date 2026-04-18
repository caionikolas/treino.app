import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  secondsRemaining: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function RestTimer({ secondsRemaining, onAdjust, onSkip }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Descanso</Text>
      <Text style={styles.clock}>{formatMmSs(secondsRemaining)}</Text>
      <View style={styles.row}>
        <ActionBtn label="-30s" onPress={() => onAdjust(-30)} />
        <ActionBtn label="Pular" onPress={onSkip} primary />
        <ActionBtn label="+30s" onPress={() => onAdjust(30)} />
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  clock: { ...typography.monoLarge, color: colors.accent, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    minWidth: 80,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnPressed: { opacity: 0.7 },
  btnLabel: { ...typography.body, color: colors.textPrimary },
  btnLabelPrimary: { fontWeight: '600' },
});
