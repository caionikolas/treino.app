import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutFormFields, WorkoutExerciseRow } from '@/components/workout';
import { Button, EmptyState } from '@/components/common';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutForm'>;

export function WorkoutFormScreen({ route, navigation }: Props) {
  const mode = route.params.mode;
  const id = route.params.mode === 'edit' ? route.params.id : null;

  const draft = useWorkoutDraftStore();
  const save = useWorkoutStore(s => s.save);
  const allExercises = useExerciseStore(s => s.all);

  useEffect(() => {
    if (mode === 'new') {
      draft.loadNew();
    } else if (id) {
      draft.loadExisting(id, (exerciseId) => {
        const found = allExercises.find(e => e.id === exerciseId);
        if (!found) return undefined;
        return { name: found.name, muscleGroup: found.muscleGroup };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const confirmDiscard = (onConfirm: () => void) => {
    if (!draft.isDirty()) {
      onConfirm();
      return;
    }
    Alert.alert(
      'Descartar alterações?',
      'As alterações feitas neste treino serão perdidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onConfirm },
      ],
    );
  };

  const onCancel = () => confirmDiscard(() => navigation.goBack());

  const canSave = draft.name.trim().length > 0;

  const onSave = async () => {
    const { workout, exercises } = draft.toPersist();
    await save(workout, exercises, mode === 'new');
    draft.reset();
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'new' ? 'Novo treino' : draft.name || 'Editar treino',
      headerLeft: () => (
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={canSave ? onSave : undefined}
          disabled={!canSave}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerSave, !canSave && styles.headerDisabled]}>Salvar</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, mode, draft.name, canSave, draft.exercises]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (draft.isDirty()) {
        confirmDiscard(() => navigation.goBack());
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WorkoutFormFields
          name={draft.name}
          color={draft.color}
          onNameChange={draft.updateName}
          onColorChange={draft.updateColor}
        />

        <Text style={styles.sectionTitle}>
          Exercícios ({draft.exercises.length})
        </Text>

        {draft.exercises.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              icon="fitness-center"
              title="Nenhum exercício"
              subtitle='Toque em "Adicionar exercício" para começar'
            />
          </View>
        ) : (
          draft.exercises.map((ex, index) => (
            <WorkoutExerciseRow
              key={`${ex.exerciseId}-${index}`}
              exercise={ex}
              index={index}
              total={draft.exercises.length}
              onMoveUp={() => draft.moveUp(index)}
              onMoveDown={() => draft.moveDown(index)}
              onEdit={() => navigation.navigate('ExerciseInWorkout', { index })}
              onRemove={() => draft.removeExercise(index)}
            />
          ))
        )}

        <Button
          label="Adicionar exercício"
          variant="secondary"
          onPress={() => navigation.navigate('ExercisePicker')}
          style={styles.addBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  empty: { minHeight: 160 },
  addBtn: { marginTop: spacing.md },
  headerBtn: { paddingHorizontal: spacing.sm },
  headerCancel: { ...typography.body, color: colors.textSecondary },
  headerSave: { ...typography.body, color: colors.accent, fontWeight: '600' },
  headerDisabled: { opacity: 0.4 },
});
