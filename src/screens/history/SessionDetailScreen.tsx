import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, EmptyState } from '@/components/common';
import { ExerciseLogGroup } from '@/components/history';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { SessionDetail } from '@/types/history';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { HistoryStackParamList } from '@/navigation/HistoryStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<HistoryStackParamList, 'SessionDetail'>;

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm} min ${ss.toString().padStart(2, '0')}s`;
}

export function SessionDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const start = useActiveSessionStore(s => s.start);
  const allExercises = useExerciseStore(s => s.all);

  useEffect(() => {
    (async () => {
      const d = await sessionRepository.findById(id);
      setDetail(d);
      setLoading(false);
    })();
  }, [id]);

  const onRepeat = async () => {
    if (!detail || !detail.workoutExists) {
      Alert.alert('Treino original não existe mais');
      return;
    }
    const workoutData = await workoutRepository.findById(detail.session.workoutId);
    if (!workoutData) {
      Alert.alert('Treino original não existe mais');
      return;
    }
    const enriched = workoutData.exercises.map(e => {
      const info = allExercises.find(x => x.id === e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseName: info?.name ?? e.exerciseId,
        muscleGroup: (info?.muscleGroup ?? 'chest') as MuscleGroupKey,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    start(workoutData.workout.id, enriched);
    navigation.navigate('WorkoutExecution');
  };

  if (loading) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Sessão não encontrada" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: detail.workoutColor }]}>
          <Text style={styles.name}>{detail.workoutName}</Text>
          <Text style={styles.sub}>
            {formatDate(detail.session.startedAt)} • {formatDuration(detail.session.durationSeconds)}
          </Text>
        </View>

        {detail.session.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notas</Text>
            <Text style={styles.notesText}>{detail.session.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Exercícios</Text>
        {detail.setsByExercise.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhum exercício registrado nesta sessão</Text>
        ) : (
          detail.setsByExercise.map(group => (
            <ExerciseLogGroup
              key={group.exerciseId}
              exerciseName={group.exerciseName}
              muscleGroup={group.muscleGroup}
              sets={group.sets}
            />
          ))
        )}

        <Button
          label="Repetir treino"
          onPress={onRepeat}
          disabled={!detail.workoutExists}
          style={styles.repeatBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  name: { ...typography.title, color: colors.textPrimary, fontWeight: '700' },
  sub: { ...typography.body, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs, textTransform: 'capitalize' },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  notesText: { ...typography.body, color: colors.textPrimary },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyHint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
  repeatBtn: { marginTop: spacing.lg },
});
