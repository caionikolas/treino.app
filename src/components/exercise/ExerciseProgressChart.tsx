import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Point {
  finishedAt: number;
  maxWeight: number;
}

interface Props {
  points: Point[];
}

const WEEKDAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDay(ts: number): string {
  const d = new Date(ts);
  return WEEKDAY_LABEL[d.getDay()];
}

export function ExerciseProgressChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nenhum treino registrado ainda.</Text>
      </View>
    );
  }

  const maxW = Math.max(...points.map(p => p.maxWeight), 1);
  const currentW = points[points.length - 1].maxWeight;
  const minBarPct = 0.15;

  return (
    <View>
      <Text style={styles.currentWeight}>{currentW}kg</Text>

      <View style={styles.chart}>
        {points.map((p, i) => {
          const pct = maxW > 0 ? p.maxWeight / maxW : 0;
          const barHeightPct = minBarPct + (1 - minBarPct) * pct;
          return (
            <View key={i} style={styles.col}>
              <View style={styles.barArea}>
                <View style={[styles.bar, { height: `${barHeightPct * 100}%` }]}>
                  <View style={styles.iconBubble}>
                    <Icon name="fitness-center" size={12} color={colors.textPrimary} />
                  </View>
                </View>
              </View>
              <Text style={styles.weightLabel}>{p.maxWeight}kg</Text>
              <Text style={styles.dayLabel}>{formatDay(p.finishedAt)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textSecondary },
  currentWeight: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 8,
  },
  col: { flex: 1, alignItems: 'center', height: '100%' },
  barArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  weightLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
