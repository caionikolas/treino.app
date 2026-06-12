import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutCard } from '@/components/workout';
import { EmptyState } from '@/components/common';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

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
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Apagar treino?',
      `"${name}" será removido. Esta ação não pode ser desfeita.`,
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
  };

  const goNew = () => navigation.navigate('WorkoutForm', { mode: 'new' });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Sua rotina</Text>
          <Text style={styles.title}>Treinos</Text>
        </View>
        <Pressable
          onPress={goNew}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          hitSlop={8}
        >
          <View style={styles.addBtnIconCircle}>
            <Icon name="add" size={16} color={colors.accent} />
          </View>
          <Text style={styles.addBtnText}>novo</Text>
        </Pressable>
      </View>

      <FlatList
        data={summaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => navigation.navigate('WorkoutPreview', { id: item.id })}
            onLongPress={() => openMenu(item.id, item.name)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onDelete={() => confirmDelete(item.id, item.name)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="fitness-center"
            title="Nenhum treino ainda"
            subtitle='Toque em "Novo" para criar seu primeiro treino'
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleBlock: { gap: 2 },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  addBtnPressed: { opacity: 0.85 },
  addBtnIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
});
