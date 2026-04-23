import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlanStackParamList } from '@/navigation/PlanStack';
import { Plan, PlanFrequency, PlanWorkout } from '@/types/plan';
import { usePlanStore, emptyPlan } from '@/store/usePlanStore';
import { planRepository } from '@/database/repositories/planRepository';
import { scheduleReminderForPlan, cancelReminderForPlan, requestRemindersPermission, setupPlanReminderChannel } from '@/services/reminderService';
import { colors } from '@/theme';

type Nav = NativeStackNavigationProp<PlanStackParamList, 'PlanForm'>;
type Rt = RouteProp<PlanStackParamList, 'PlanForm'>;

const FREQ_OPTIONS: { value: PlanFrequency; label: string }[] = [
  { value: 'daily', label: 'Todo dia' },
  { value: 'mon_to_sat', label: 'Seg a Sáb' },
  { value: 'mon_to_fri', label: 'Seg a Sex' },
];

const COLOR_PALETTE = ['#E94560', '#0F3460', '#16213E', '#00C851', '#FFBB33', '#9C27B0'];

export function PlanFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const save = usePlanStore(s => s.save);
  const remove = usePlanStore(s => s.remove);

  const isEdit = route.params.mode === 'edit';
  const editId = isEdit ? (route.params as { mode: 'edit'; id: string }).id : null;

  const [plan, setPlan] = useState<Plan>(emptyPlan());
  const [workouts, setWorkouts] = useState<PlanWorkout[]>([]);

  useEffect(() => {
    (async () => {
      if (editId) {
        const found = await planRepository.findById(editId);
        if (found) {
          setPlan(found.plan);
          setWorkouts(found.workouts);
        }
      }
    })();
  }, [editId]);

  const update = <K extends keyof Plan>(k: K, v: Plan[K]) => setPlan(p => ({ ...p, [k]: v }));

  const onToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      await setupPlanReminderChannel();
      const ok = await requestRemindersPermission();
      if (!ok) {
        Alert.alert('Permissão negada', 'Habilite as notificações nas configurações do sistema para receber lembretes.');
        return;
      }
      update('reminderEnabled', true);
      if (!plan.reminderTime) update('reminderTime', '18:00');
    } else {
      update('reminderEnabled', false);
    }
  };

  const onSubmit = async () => {
    if (!plan.name.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome ao plano.');
      return;
    }
    const now = Date.now();
    const finalPlan: Plan = { ...plan, name: plan.name.trim(), updatedAt: now };
    await save(finalPlan, workouts, !isEdit);
    if (finalPlan.reminderEnabled && finalPlan.reminderTime) {
      await scheduleReminderForPlan(finalPlan);
    } else {
      await cancelReminderForPlan(finalPlan.id);
    }
    navigation.goBack();
  };

  const onDelete = () => {
    if (!editId) return;
    Alert.alert('Excluir plano', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await cancelReminderForPlan(editId);
          await remove(editId);
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={plan.name}
        onChangeText={t => update('name', t)}
        placeholder="Ex: Hipertrofia Mar/Abr"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={plan.description ?? ''}
        onChangeText={t => update('description', t || null)}
        multiline
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Cor</Text>
      <View style={styles.colorRow}>
        {COLOR_PALETTE.map(c => (
          <Pressable
            key={c}
            onPress={() => update('color', c)}
            style={[styles.swatch, { backgroundColor: c, borderWidth: plan.color === c ? 3 : 0 }]}
          />
        ))}
      </View>

      <Text style={styles.label}>Frequência</Text>
      {FREQ_OPTIONS.map(opt => (
        <Pressable
          key={opt.value}
          onPress={() => update('frequency', opt.value)}
          style={[styles.radio, plan.frequency === opt.value && styles.radioActive]}
        >
          <Text style={styles.radioLabel}>{opt.label}</Text>
        </Pressable>
      ))}

      <View style={styles.switchRow}>
        <Text style={styles.label}>Lembrete diário</Text>
        <Switch value={plan.reminderEnabled} onValueChange={onToggleReminder} />
      </View>

      {plan.reminderEnabled ? (
        <>
          <Text style={styles.label}>Horário (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={plan.reminderTime ?? ''}
            onChangeText={t => update('reminderTime', t)}
            placeholder="18:00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </>
      ) : null}

      <Pressable
        style={styles.workoutsBtn}
        onPress={() => {
          if (!isEdit) {
            Alert.alert('Salve primeiro', 'Salve o plano para depois adicionar treinos.');
            return;
          }
          navigation.navigate('PlanWorkoutPicker', { planId: plan.id });
        }}
      >
        <Text style={styles.workoutsBtnText}>
          Editar treinos ({workouts.length})
        </Text>
      </Pressable>

      <Pressable style={styles.submit} onPress={onSubmit}>
        <Text style={styles.submitText}>{isEdit ? 'Salvar' : 'Criar plano'}</Text>
      </Pressable>

      {isEdit ? (
        <Pressable style={styles.delete} onPress={onDelete}>
          <Text style={styles.deleteText}>Excluir plano</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  label: { color: colors.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface, color: colors.textPrimary,
    padding: 12, borderRadius: 8, fontSize: 16,
  },
  colorRow: { flexDirection: 'row', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderColor: colors.textPrimary },
  radio: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 8, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  radioActive: { borderColor: colors.accent },
  radioLabel: { color: colors.textPrimary, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workoutsBtn: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 8, marginTop: 24, alignItems: 'center',
  },
  workoutsBtnText: { color: colors.textPrimary, fontSize: 15 },
  submit: {
    backgroundColor: colors.accent, padding: 16, borderRadius: 8, marginTop: 24, alignItems: 'center',
  },
  submitText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  delete: { padding: 16, marginTop: 16, alignItems: 'center' },
  deleteText: { color: colors.warning, fontSize: 14 },
});
