import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import {
  ExerciseCard,
  MuscleGroupFilter,
  CategoryFilter,
} from '@/components/exercise';
import { Input, EmptyState } from '@/components/common';
import { ExerciseStackParamList } from '@/navigation/ExerciseStack';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<ExerciseStackParamList, 'ExerciseLibrary'>;

export function ExerciseLibraryScreen({ navigation }: Props) {
  const {
    search, setSearch,
    muscleGroup, setMuscleGroup,
    category, setCategory,
    filtered,
  } = useExerciseStore();

  const data = filtered();

  return (
    <SafeAreaView style={styles.container}>
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
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
          />
        )}
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
  searchWrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { padding: spacing.md, flexGrow: 1 },
});
