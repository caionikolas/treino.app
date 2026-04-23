import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PlanStackParamList } from '@/navigation/PlanStack';
import { Plan, PlanWorkout } from '@/types/plan';
import { planRepository } from '@/database/repositories/planRepository';
import { reconcilePlan } from '@/services/planProgressService';
import { isRestDay } from '@/utils/planSchedule';
import { usePlanStore } from '@/store/usePlanStore';
import { scheduleReminderForPlan } from '@/services/reminderService';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { getDb } from '@/database/connection';
import { colors } from '@/theme';

type Nav = NativeStackNavigationProp<PlanStackParamList, 'PlanDetail'>;
type Rt = RouteProp<PlanStackParamList, 'PlanDetail'>;

interface SessionStat { totalSessions: number; durationDays: number; }

export function PlanDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { id } = route.params;

  const start = usePlanStore(s => s.start);
  const restart = usePlanStore(s => s.restart);
  const workoutSummaries = useWorkoutStore(s => s.summaries);
  const loadWorkouts = useWorkoutStore(s => s.load);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [workouts, setWorkouts] = useState<PlanWorkout[]>([]);
  const [stats, setStats] = useState<SessionStat | null>(null);

  const reload = useCallback(async () => {
    await reconcilePlan(id);
    const found = await planRepository.findById(id);
    if (!found) return;
    setPlan(found.plan);
    setWorkouts(found.workouts);
    if (found.plan.status === 'completed' && found.plan.startedAt && found.plan.completedAt) {
      const db = getDb();
      const wIds = found.workouts.map(w => w.workoutId);
      const placeholders = wIds.map(() => '?').join(',');
      const r = await db.execute(
        `SELECT COUNT(*) AS c FROM workout_sessions
         WHERE finished_at IS NOT NULL AND finished_at BETWEEN ? AND ?
         AND workout_id IN (${placeholders})`,
        [found.plan.startedAt, found.plan.completedAt, ...wIds],
      );
      const row = r.rows?.[0] as { c: number } | undefined;
      const days = Math.max(1, Math.ceil((found.plan.completedAt - found.plan.startedAt) / (1000 * 60 * 60 * 24)));
      setStats({ totalSessions: row?.c ?? 0, durationDays: days });
    } else {
      setStats(null);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadWorkouts(); reload(); }, [reload, loadWorkouts]));

  if (!plan) return <View style={styles.container} />;

  const getName = (wid: string) => workoutSummaries.find(s => s.id === wid)?.name ?? '(treino removido)';
  const today = new Date();
  const restDay = isRestDay(plan.frequency, today);
  const suggested = plan.status === 'active' && !restDay ? workouts[plan.currentIndex] : null;

  const onStart = async () => {
    if (workouts.length === 0) {
      Alert.alert('Plano vazio', 'Adicione treinos antes de iniciar.');
      return;
    }
    await start(plan.id);
    const after = await planRepository.findById(plan.id);
    if (after?.plan.reminderEnabled && after.plan.reminderTime) {
      await scheduleReminderForPlan(after.plan);
    }
    await reload();
  };

  const onRestart = async () => {
    Alert.alert('Reiniciar plano', 'Começar do início novamente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar', onPress: async () => {
          await restart(plan.id);
          const after = await planRepository.findById(plan.id);
          if (after?.plan.reminderEnabled && after.plan.reminderTime) {
            await scheduleReminderForPlan(after.plan);
          }
          await reload();
        },
      },
    ]);
  };

  const onRunWorkout = (workoutId: string) => {
    (navigation.getParent() as any)?.navigate('Workouts', {
      screen: 'WorkoutPreview',
      params: { id: workoutId },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.header, { borderLeftColor: plan.color }]}>
        <Text style={styles.title}>{plan.name}</Text>
        {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
        <Pressable onPress={() => navigation.navigate('PlanForm', { mode: 'edit', id: plan.id })}>
          <Text style={styles.editLink}>Editar plano</Text>
        </Pressable>
      </View>

      {plan.status === 'idle' ? (
        <Pressable style={styles.primaryBtn} onPress={onStart}>
          <Text style={styles.primaryBtnText}>Iniciar plano</Text>
        </Pressable>
      ) : null}

      {plan.status === 'active' && restDay ? (
        <View style={styles.restCard}>
          <Text style={styles.restText}>Hoje é dia de descanso 💤</Text>
        </View>
      ) : null}

      {plan.status === 'active' && suggested ? (
        <View style={styles.suggestedCard}>
          <Text style={styles.suggestedLabel}>Treino de hoje</Text>
          <Text style={styles.suggestedName}>{getName(suggested.workoutId)}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => onRunWorkout(suggested.workoutId)}>
            <Icon name="play-arrow" size={22} color={colors.textPrimary} />
            <Text style={styles.primaryBtnText}>Iniciar treino</Text>
          </Pressable>
        </View>
      ) : null}

      {plan.status === 'completed' && stats ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Plano concluído 🎉</Text>
          <Text style={styles.statsLine}>Sessões: {stats.totalSessions}</Text>
          <Text style={styles.statsLine}>Duração: {stats.durationDays} dia(s)</Text>
          <Text style={styles.statsLine}>Treinos da sequência: {workouts.length}</Text>
          <Pressable style={styles.primaryBtn} onPress={onRestart}>
            <Text style={styles.primaryBtnText}>Reiniciar plano</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Treinos do plano</Text>
      {workouts.length === 0 ? (
        <Text style={styles.empty}>Nenhum treino. Edite o plano para adicionar.</Text>
      ) : workouts.map((pw, i) => (
        <Pressable key={pw.id} style={styles.workoutRow} onPress={() => onRunWorkout(pw.workoutId)}>
          <Text style={styles.workoutIndex}>{i + 1}.</Text>
          <Text style={[styles.workoutName, i === plan.currentIndex && plan.status === 'active' && styles.currentName]}>
            {getName(pw.workoutId)}
          </Text>
          {i === plan.currentIndex && plan.status === 'active' ? (
            <Icon name="play-circle-filled" size={22} color={colors.accent} />
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, padding: 16, borderRadius: 8, borderLeftWidth: 4, marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  desc: { color: colors.textSecondary, marginTop: 4 },
  editLink: { color: colors.accent, marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row', backgroundColor: colors.accent, padding: 14, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  primaryBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  restCard: { backgroundColor: colors.surface, padding: 24, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  restText: { color: colors.textPrimary, fontSize: 16 },
  suggestedCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 8, marginBottom: 16 },
  suggestedLabel: { color: colors.textSecondary, fontSize: 13 },
  suggestedName: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 4 },
  statsCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 8, marginBottom: 16 },
  statsTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  statsLine: { color: colors.textPrimary, fontSize: 15, marginVertical: 2 },
  sectionTitle: { color: colors.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 8 },
  workoutRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: 8, gap: 8 },
  workoutIndex: { color: colors.textSecondary, width: 24 },
  workoutName: { color: colors.textPrimary, fontSize: 15, flex: 1 },
  currentName: { fontWeight: '700' },
  empty: { color: colors.textSecondary, fontStyle: 'italic' },
});
