import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutCard } from '@/components/workout';
import { EmptyState } from '@/components/common';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, radius } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutList'>;

export function WorkoutListScreen({ navigation }: Props) {
  const summaries = useWorkoutStore(s => s.summaries);
  const load = useWorkoutStore(s => s.load);
  const duplicate = useWorkoutStore(s => s.duplicate);
  const remove = useWorkoutStore(s => s.remove);
  const toggleFavorite = useWorkoutStore(s => s.toggleFavorite);

  useEffect(() => {
    load();
  }, [load]);

  const openMenu = (id: string, name: string) => {
    Alert.alert(name, undefined, [
      {
        text: 'Duplicar',
        onPress: async () => {
          const newId = await duplicate(id);
          if (newId) {
            navigation.navigate('WorkoutForm', { mode: 'edit', id: newId });
          }
        },
      },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Apagar treino?',
            'Esta ação não pode ser desfeita.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Apagar',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await remove(id);
                  } catch (e) {
                    Alert.alert('Não foi possível excluir', e instanceof Error ? e.message : 'Erro');
                  }
                },
              },
            ],
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => navigation.navigate('WorkoutPreview', { id: item.id })}
            onLongPress={() => openMenu(item.id, item.name)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="fitness-center"
            title="Nenhum treino ainda"
            subtitle='Toque em + para criar seu primeiro treino'
          />
        }
      />
      <Pressable
        onPress={() => navigation.navigate('WorkoutForm', { mode: 'new' })}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Icon name="add" size={32} color={colors.textPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
