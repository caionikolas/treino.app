import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, EmptyState, Toggle, StepperModal } from '@/components/common';
import { SetRow } from '@/components/workout';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { formatRestTime } from '@/utils/formatRestTime';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExerciseInWorkout'>;

export function ExerciseInWorkoutScreen({ route, navigation }: Props) {
  const { index } = route.params;
  const exercise = useWorkoutDraftStore(s => s.exercises[index]);
  const updateSetReps = useWorkoutDraftStore(s => s.updateSetReps);
  const addSet = useWorkoutDraftStore(s => s.addSet);
  const removeSet = useWorkoutDraftStore(s => s.removeSet);
  const toggleWarmup = useWorkoutDraftStore(s => s.toggleWarmup);
  const setWarmupReps = useWorkoutDraftStore(s => s.setWarmupReps);
  const toggleRest = useWorkoutDraftStore(s => s.toggleRest);
  const updateRestSeconds = useWorkoutDraftStore(s => s.updateRestSeconds);

  const [restModal, setRestModal] = useState(false);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.name}>{exercise.exerciseName}</Text>
          <View style={styles.timer}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.timerText}>00:00</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Pressable
            style={[styles.restBadge, !exercise.restEnabled && styles.restBadgeOff]}
            onPress={() => exercise.restEnabled && setRestModal(true)}
          >
            <MaterialIcons name="schedule" size={14} color={colors.textPrimary} />
            <Text style={styles.restText}>{formatRestTime(exercise.restSeconds)} rest</Text>
          </Pressable>

          <View style={styles.toggleWrap}>
            <Text style={styles.toggleLabel}>Warm-up</Text>
            <Toggle value={exercise.warmupEnabled} onChange={() => toggleWarmup(index)} />
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.toggleLabel}>Descanso ativado</Text>
          <Toggle value={exercise.restEnabled} onChange={() => toggleRest(index)} />
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.thSet, styles.th]}>Set</Text>
          <Text style={[styles.thReps, styles.th]}>Reps</Text>
          <Text style={[styles.thWeight, styles.th]}>Weight</Text>
          <View style={{ width: 28 }} />
        </View>

        {exercise.warmupEnabled && (
          <SetRow
            setLabel="warmup"
            reps={exercise.warmupReps ?? 10}
            onChangeReps={(n) => setWarmupReps(index, n)}
          />
        )}

        {exercise.repsPerSet.map((reps, i) => (
          <SetRow
            key={i}
            setLabel={String(i + 1)}
            reps={reps}
            onChangeReps={(n) => updateSetReps(index, i, n)}
            onRemove={exercise.repsPerSet.length > 1 ? () => removeSet(index, i) : undefined}
          />
        ))}

        <Pressable onPress={() => addSet(index)} style={styles.addSet}>
          <Text style={styles.addSetText}>+ Adicionar série</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Concluir" onPress={() => navigation.goBack()} style={styles.cta} />
      </View>

      <StepperModal
        visible={restModal}
        title="Descanso entre séries"
        description="Tempo de descanso para este exercício."
        initial={exercise.restSeconds}
        min={0}
        max={600}
        step={15}
        formatter={formatRestTime}
        onClose={() => setRestModal(false)}
        onSave={(s) => updateRestSeconds(index, s)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: { ...typography.heading, color: colors.accent, fontWeight: '700' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { ...typography.body, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  restBadgeOff: { opacity: 0.4 },
  restText: { ...typography.caption, color: colors.textPrimary },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff15',
  },
  th: { ...typography.caption, color: colors.textSecondary },
  thSet: { width: 40, textAlign: 'center' },
  thReps: { flex: 1, paddingHorizontal: spacing.sm },
  thWeight: { flex: 1, paddingHorizontal: spacing.sm },
  addSet: { paddingVertical: spacing.md, alignItems: 'flex-start' },
  addSetText: { ...typography.body, color: colors.textPrimary },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff10',
  },
  cta: { borderRadius: 999 },
});
