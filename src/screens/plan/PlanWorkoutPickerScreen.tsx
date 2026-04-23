import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PlanStackParamList } from '@/navigation/PlanStack';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { planRepository } from '@/database/repositories/planRepository';
import { Plan, PlanWorkout } from '@/types/plan';
import { generateId } from '@/utils/generateId';
import { colors } from '@/theme';

type Nav = NativeStackNavigationProp<PlanStackParamList, 'PlanWorkoutPicker'>;
type Rt = RouteProp<PlanStackParamList, 'PlanWorkoutPicker'>;

export function PlanWorkoutPickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { planId } = route.params;

  const summaries = useWorkoutStore(s => s.summaries);
  const loadWorkouts = useWorkoutStore(s => s.load);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<string[]>([]); // ordered workoutIds

  useEffect(() => {
    loadWorkouts();
    (async () => {
      const found = await planRepository.findById(planId);
      if (found) {
        setPlan(found.plan);
        setSelected(found.workouts.map(w => w.workoutId));
      }
    })();
  }, [planId, loadWorkouts]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const move = (idx: number, delta: number) => {
    setSelected(prev => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const onSave = async () => {
    if (!plan) return;
    const next: PlanWorkout[] = selected.map((wid, i) => ({
      id: generateId(),
      planId,
      workoutId: wid,
      orderIndex: i,
    }));

    // If plan is active, warn about progress impact
    if (plan.status === 'active') {
      const oldWorkoutIds = (await planRepository.findById(planId))?.workouts.map(w => w.workoutId) ?? [];
      const reordered = JSON.stringify(oldWorkoutIds) !== JSON.stringify(selected);
      if (reordered) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            'Plano em andamento',
            'Mudar a sequência pode afetar o progresso atual. Continuar?',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => reject(new Error('cancel')) },
              { text: 'Continuar', onPress: () => resolve() },
            ],
          );
        }).catch(() => null);
      }
    }

    // Adjust currentIndex to point to same workoutId if still present, else clamp
    let newIndex = plan.currentIndex;
    const oldFound = await planRepository.findById(planId);
    const oldCurrent = oldFound?.workouts[plan.currentIndex]?.workoutId;
    if (oldCurrent) {
      const newPos = selected.indexOf(oldCurrent);
      newIndex = newPos >= 0 ? newPos : Math.min(plan.currentIndex, selected.length);
    } else {
      newIndex = Math.min(plan.currentIndex, selected.length);
    }

    const updatedPlan: Plan = { ...plan, currentIndex: newIndex, updatedAt: Date.now() };
    await planRepository.update(planId, updatedPlan, next);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          selected.length > 0 ? (
            <View style={styles.selectedSection}>
              <Text style={styles.sectionTitle}>Sequência ({selected.length})</Text>
              {selected.map((wid, i) => {
                const w = summaries.find(s => s.id === wid);
                if (!w) return null;
                return (
                  <View key={wid} style={styles.selectedRow}>
                    <Text style={styles.selectedIndex}>{i + 1}.</Text>
                    <Text style={styles.selectedName}>{w.name}</Text>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0}>
                      <Icon name="arrow-upward" size={22} color={i === 0 ? colors.textSecondary : colors.textPrimary} />
                    </Pressable>
                    <Pressable onPress={() => move(i, 1)} disabled={i === selected.length - 1}>
                      <Icon name="arrow-downward" size={22} color={i === selected.length - 1 ? colors.textSecondary : colors.textPrimary} />
                    </Pressable>
                  </View>
                );
              })}
              <View style={styles.divider} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} style={styles.row}>
              <Icon name={isSelected ? 'check-box' : 'check-box-outline-blank'} size={24} color={colors.accent} />
              <Text style={styles.rowName}>{item.name}</Text>
            </Pressable>
          );
        }}
      />
      <Pressable style={styles.save} onPress={onSave}>
        <Text style={styles.saveText}>Salvar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  sectionTitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  selectedSection: { marginBottom: 16 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  selectedIndex: { color: colors.textSecondary, width: 24 },
  selectedName: { color: colors.textPrimary, fontSize: 15, flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowName: { color: colors.textPrimary, fontSize: 16 },
  save: { backgroundColor: colors.accent, padding: 16, alignItems: 'center', margin: 16, borderRadius: 8 },
  saveText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
});
