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
  const progressLabel = summary.workoutCount > 0
    ? `${Math.min(summary.currentIndex, summary.workoutCount)} de ${summary.workoutCount}`
    : '—';

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {summary.workoutCount > 0 ? `${summary.workoutCount} treinos` : 'Sem treinos'}
          </Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>{summary.name}</Text>
        <Text style={styles.status}>{STATUS_LABEL[summary.status]}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="check-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{progressLabel}</Text>
          </View>
          {summary.reminderEnabled && summary.reminderTime ? (
            <View style={styles.metaItem}>
              <Icon name="notifications" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{summary.reminderTime}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.thumb, { backgroundColor: summary.color }]}>
        <Icon name="event-note" size={44} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  left: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 2 },
  status: { color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textSecondary, fontSize: 13 },
  thumb: {
    width: 92,
    height: 110,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
