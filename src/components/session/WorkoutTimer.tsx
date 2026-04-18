import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useIntervalTimer } from '@/hooks/useIntervalTimer';
import { colors, typography } from '@/theme';

interface Props {
  startedAt: number;
}

function formatHhMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WorkoutTimer({ startedAt }: Props) {
  const [now, setNow] = useState<number>(Date.now());
  useIntervalTimer(1000, setNow);
  const elapsed = Math.floor((now - startedAt) / 1000);
  return <Text style={styles.clock}>{formatHhMmSs(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  clock: { ...typography.heading, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
