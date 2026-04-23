import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PlanSummary } from '@/types/plan';
import { colors } from '@/theme';

interface Props {
  summary: PlanSummary;
  onPress: () => void;
}

const STATUS_LABEL: Record<PlanSummary['status'], string> = {
  idle: 'Não iniciado',
  active: 'Em andamento',
  completed: 'Concluído',
};

export function PlanCard({ summary, onPress }: Props) {
  const progress = summary.workoutCount > 0
    ? `${Math.min(summary.currentIndex, summary.workoutCount)}/${summary.workoutCount} treinos`
    : 'Sem treinos';

  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: summary.color }]}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{summary.name}</Text>
        {summary.reminderEnabled && summary.reminderTime ? (
          <View style={styles.reminderBadge}>
            <Icon name="notifications" size={14} color={colors.textSecondary} />
            <Text style={styles.reminderText}>{summary.reminderTime}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.status}>{STATUS_LABEL[summary.status]}</Text>
      <Text style={styles.progress}>{progress}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', flex: 1 },
  reminderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderText: { color: colors.textSecondary, fontSize: 12 },
  status: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  progress: { color: colors.textPrimary, fontSize: 14, marginTop: 2 },
});
