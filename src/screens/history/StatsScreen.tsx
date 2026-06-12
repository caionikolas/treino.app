import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, ScrollView, View } from 'react-native';
import { SettingRow, EmptyState } from '@/components/common';
import { useHistoryStore } from '@/store/useHistoryStore';
import { colors, spacing } from '@/theme';

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const mm = Math.round(seconds / 60);
  return `${mm} min`;
}

export function StatsScreen() {
  const stats = useHistoryStore(s => s.stats);
  const loadStats = useHistoryStore(s => s.loadStats);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (stats == null) {
    return <SafeAreaView style={styles.container} />;
  }

  if (stats.totalSessions === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="insights"
          title="Nenhum treino ainda"
          subtitle="Complete um treino para ver suas estatísticas"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <SettingRow
            icon="event-available"
            label="Treinos este mês"
            value={String(stats.sessionsThisMonth)}
          />
          <SettingRow
            icon="event-repeat"
            label="Frequência semanal"
            value={stats.avgSessionsPerWeek.toFixed(1)}
          />
          <SettingRow
            icon="timer"
            label="Duração média"
            value={formatDuration(stats.avgDurationSeconds)}
          />
          <SettingRow
            icon="fitness-center"
            label="Total de treinos"
            value={String(stats.totalSessions)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingBottom: spacing.xs,
  },
});
