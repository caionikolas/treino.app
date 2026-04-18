import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button, EmptyState } from '@/components/common';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExerciseInWorkout'>;

export function ExerciseInWorkoutScreen({ route, navigation }: Props) {
  const { index } = route.params;
  const exercise = useWorkoutDraftStore(s => s.exercises[index]);
  const updateExerciseConfig = useWorkoutDraftStore(s => s.updateExerciseConfig);

  const [sets, setSets] = useState<string>(exercise ? String(exercise.sets) : '4');
  const [reps, setReps] = useState<string>(exercise?.reps ?? '12');
  const [rest, setRest] = useState<string>(exercise ? String(exercise.restSeconds) : '90');

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  const onSave = () => {
    const parsedSets = Math.max(1, parseInt(sets, 10) || 1);
    const parsedRest = Math.max(0, parseInt(rest, 10) || 0);
    updateExerciseConfig(index, {
      sets: parsedSets,
      reps: reps.trim() || '12',
      restSeconds: parsedRest,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{exercise.exerciseName}</Text>
        <Input
          label="Séries"
          value={sets}
          onChangeText={setSets}
          keyboardType="number-pad"
        />
        <Input
          label="Repetições"
          value={reps}
          onChangeText={setReps}
          placeholder='Ex: 12 ou 8-12'
        />
        <Input
          label="Descanso (segundos)"
          value={rest}
          onChangeText={setRest}
          keyboardType="number-pad"
        />
        <View style={styles.buttons}>
          <Button label="Cancelar" variant="ghost" onPress={() => navigation.goBack()} style={styles.btn} />
          <Button label="Salvar" onPress={onSave} style={styles.btn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});
