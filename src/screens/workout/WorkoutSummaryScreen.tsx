import React, { useState } from 'react';
import { ScrollView, StyleSheet, SafeAreaView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '@/components/common';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutSummary'>;

function formatDuration(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  if (mm === 0) return `${ss}s`;
  return `${mm}min ${ss.toString().padStart(2, '0')}s`;
}

export function WorkoutSummaryScreen({ navigation }: Props) {
  const exercises = useActiveSessionStore(s => s.exercises);
  const loggedSets = useActiveSessionStore(s => s.loggedSets);
  const startedAt = useActiveSessionStore(s => s.startedAt);
  const setNotes = useActiveSessionStore(s => s.setNotes);
  const finalize = useActiveSessionStore(s => s.finalize);
  const reset = useActiveSessionStore(s => s.reset);

  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const totalTargetSets = exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const duration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  const onFinish = async () => {
    setSaving(true);
    setNotes(notesInput);
    const { session, sets } = finalize();
    await sessionRepository.insert(session, sets);
    reset();
    setSaving(false);
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Treino concluído</Text>

        <View style={styles.statsRow}>
          <StatBlock label="Duração" value={formatDuration(duration)} />
          <StatBlock label="Séries" value={`${loggedSets.length}/${totalTargetSets}`} />
        </View>

        <Text style={styles.sectionTitle}>Notas</Text>
        <Input
          value={notesInput}
          onChangeText={setNotesInput}
          multiline
          placeholder="Como foi o treino?"
          style={styles.notesInput}
        />

        <Button
          label="Concluir"
          onPress={onFinish}
          loading={saving}
          style={styles.finishBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { ...typography.title, color: colors.accent, fontWeight: '700' },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  notesInput: { minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.lg },
  finishBtn: { marginTop: spacing.md },
});
