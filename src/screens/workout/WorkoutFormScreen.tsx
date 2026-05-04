import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Pressable,
  Alert,
  BackHandler,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutFormFields } from '@/components/workout';
import { Button } from '@/components/common';
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
      'As alterações serão perdidas.',
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
    const newId = workout.id;
    draft.reset();
    if (mode === 'new') {
      navigation.replace('WorkoutPreview', { id: newId });
    } else {
      navigation.goBack();
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'new' ? 'Novo treino' : draft.name || 'Editar treino',
      headerLeft: () => (
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, mode, draft.name]);

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
          defaultSets={draft.defaultSets}
          defaultRestSeconds={draft.defaultRestSeconds}
          onNameChange={draft.updateName}
          onColorChange={draft.updateColor}
          onDefaultSetsChange={draft.updateDefaultSets}
          onDefaultRestChange={draft.updateDefaultRest}
        />
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={mode === 'new' ? 'Criar treino' : 'Salvar'}
          onPress={canSave ? onSave : () => {}}
          disabled={!canSave}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff10',
  },
  cta: { borderRadius: 999 },
  headerBtn: { paddingHorizontal: spacing.sm },
  headerCancel: { ...typography.body, color: colors.textSecondary },
});
