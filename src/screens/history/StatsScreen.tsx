import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatsCard } from '@/components/history';
import { EmptyState } from '@/components/common';
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
        <StatsCard label="Treinos este mês" value={String(stats.sessionsThisMonth)} />
        <StatsCard label="Frequência semanal" value={stats.avgSessionsPerWeek.toFixed(1)} />
        <StatsCard label="Duração média" value={formatDuration(stats.avgDurationSeconds)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
