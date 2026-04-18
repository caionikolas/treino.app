import React, { useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import {
  ExerciseCard,
  MuscleGroupFilter,
  CategoryFilter,
} from '@/components/exercise';
import { Input, EmptyState } from '@/components/common';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExercisePicker'>;

export function ExercisePickerScreen({ navigation }: Props) {
  const {
    search, setSearch,
    muscleGroup, setMuscleGroup,
    category, setCategory,
    filtered,
  } = useExerciseStore();

  const addExercise = useWorkoutDraftStore(s => s.addExercise);
  const hasExercise = useWorkoutDraftStore(s => s.hasExercise);
  const addedCount = useWorkoutDraftStore(s => s.exercises.length);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.goBack()} style={styles.doneBtn}>
          <Text style={styles.doneTxt}>Concluído</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const data = filtered();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.subtitle}>
        {addedCount} {addedCount === 1 ? 'exercício adicionado' : 'exercícios adicionados'}
      </Text>
      <View style={styles.searchWrapper}>
        <Input
          placeholder="Buscar exercício..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <MuscleGroupFilter value={muscleGroup} onChange={setMuscleGroup} />
      <CategoryFilter value={category} onChange={setCategory} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const already = hasExercise(item.id);
          return (
            <Pressable
              disabled={already}
              onPress={() => addExercise(item.id, item.name, item.muscleGroup)}
              style={[already && styles.disabled]}
            >
              <ExerciseCard exercise={item} onPress={() => {
                if (!already) addExercise(item.id, item.name, item.muscleGroup);
              }} />
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="search-off"
            title="Nenhum exercício encontrado"
            subtitle="Tente ajustar os filtros ou a busca"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subtitle: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  searchWrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  list: { padding: spacing.md, flexGrow: 1 },
  disabled: { opacity: 0.4 },
  doneBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  doneTxt: { ...typography.body, color: colors.accent, fontWeight: '600' },
});
