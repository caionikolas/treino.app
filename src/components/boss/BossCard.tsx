import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BossView } from '@/types/boss';
import { colors, spacing } from '@/theme';

interface Props {
  view: BossView;
  onPress: () => void;
}

export function BossCard({ view, onPress }: Props) {
  const { boss, progressPoints, maxPoints, focusName, mastered, skillUnlocked } = view;
  const pct = maxPoints > 0 ? Math.round((progressPoints / maxPoints) * 100) : 0;
  const statusText = mastered
    ? 'Chefão dominado 🏆'
    : skillUnlocked
      ? 'Skill desbloqueada 🎉'
      : focusName
        ? `Foco: ${focusName}`
        : 'Comece a treinar';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: boss.color }]}>
          <Icon name={boss.icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.name} numberOfLines={1}>{boss.name}</Text>
        <Text style={styles.level}>nível {progressPoints}/{maxPoints}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: boss.color }]} />
      </View>
      <Text style={styles.status} numberOfLines={1}>{statusText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  level: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  status: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm },
});
