import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text, Pressable, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
  useIsActive,
} from 'react-native-reorderable-list';
import type { ListRenderItemInfo } from 'react-native';
import { Button, EmptyState } from '@/components/common';
import { WorkoutPreviewExerciseRow } from '@/components/workout';
import { SelectPlaylistModal } from '@/components/music';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { playlistRepository } from '@/database/repositories/playlistRepository';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { Workout, WorkoutExercise } from '@/types/workout';
import { Track } from '@/types/music';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { formatRestTime } from '@/utils/formatRestTime';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutPreview'>;

export function WorkoutPreviewScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const start = useActiveSessionStore(s => s.start);
  const allExercises = useExerciseStore(s => s.all);
  const library = useMusicLibraryStore(s => s.tracks);
  const playQueue = usePlayerStore(s => s.playQueue);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);

  const load = useCallback(async () => {
    const result = await workoutRepository.findById(id);
    if (result) {
      setWorkout(result.workout);
      setExercises(result.exercises);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const draft = useWorkoutDraftStore.getState();
        if (draft.id === id && draft.isDirty()) {
          const persisted = draft.toPersist();
          await workoutRepository.update(id, persisted.workout, persisted.exercises);
          draft.reset();
        }
        await load();
      })();
    }, [id, load]),
  );

  const onEdit = useCallback(() => {
    if (!workout) return;
    navigation.navigate('WorkoutForm', { mode: 'edit', id: workout.id });
  }, [navigation, workout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: workout?.name ?? 'Treino',
      headerRight: () =>
        workout ? (
          <Pressable onPress={onEdit} hitSlop={8} style={styles.headerBtn}>
            <MaterialIcons name="edit" size={20} color={workout.color} />
          </Pressable>
        ) : null,
    });
  }, [navigation, workout, onEdit]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Treino não encontrado" />
      </SafeAreaView>
    );
  }

  const beginSession = () => {
    if (!workout) return;
    const enriched = exercises.map(e => {
      const info = allExercises.find(x => x.id === e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseName: info?.name ?? e.exerciseId,
        muscleGroup: (info?.muscleGroup ?? 'chest') as MuscleGroupKey,
        mediaFilename: info?.mediaFilename ?? null,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    start(workout.id, enriched);
    navigation.navigate('WorkoutExecution');
  };

  const onStart = () => setPlaylistModalVisible(true);

  const onPlaylistSelected = async (playlistId: string | null) => {
    setPlaylistModalVisible(false);
    if (playlistId) {
      const result = await playlistRepository.findById(playlistId);
      if (result && result.tracks.length > 0) {
        const mapped: Track[] = result.tracks.map(pt => {
          const existing = library.find(t => t.uri === pt.trackUri);
          return existing ?? {
            id: pt.id,
            uri: pt.trackUri,
            title: pt.trackName,
            artist: pt.artistName ?? '',
            album: '',
            durationMs: pt.durationMs ?? 0,
            artworkUri: null,
          };
        });
        await playQueue(mapped, 0);
      }
    }
    beginSession();
  };

  const onAddExercise = async () => {
    await useWorkoutDraftStore.getState().loadExisting(id, (exId) => {
      const found = allExercises.find(e => e.id === exId);
      return found ? { name: found.name, muscleGroup: found.muscleGroup } : undefined;
    });
    navigation.navigate('ExercisePicker');
  };

  const onTapExercise = async (index: number) => {
    await useWorkoutDraftStore.getState().loadExisting(id, (exId) => {
      const found = allExercises.find(e => e.id === exId);
      return found ? { name: found.name, muscleGroup: found.muscleGroup } : undefined;
    });
    navigation.navigate('ExerciseInWorkout', { index });
  };

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const next = reorderItems(exercises, from, to);
    setExercises(next);
    if (!workout) return;
    const reindexed = next.map((e, i) => ({ ...e, orderIndex: i }));
    workoutRepository.update(id, workout, reindexed).catch(err => {
      console.warn('Failed to persist exercise order', err);
    });
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<WorkoutExercise>) => {
    const info = allExercises.find(x => x.id === item.exerciseId);
    return (
      <DraggableRow
        name={info?.name ?? item.exerciseId}
        info={`${item.sets}×${item.reps}`}
        onPress={() => onTapExercise(index)}
        onDelete={() => onDeleteExercise(index)}
      />
    );
  };

  const onDeleteExercise = (index: number) => {
    const ex = exercises[index];
    if (!ex) return;
    const info = allExercises.find(x => x.id === ex.exerciseId);
    Alert.alert(
      'Remover exercício?',
      info?.name ?? 'Este exercício será removido do treino.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const draft = useWorkoutDraftStore.getState();
            await draft.loadExisting(id, (exId) => {
              const found = allExercises.find(e => e.id === exId);
              return found ? { name: found.name, muscleGroup: found.muscleGroup } : undefined;
            });
            draft.removeExercise(index);
            const persisted = draft.toPersist();
            await workoutRepository.update(id, persisted.workout, persisted.exercises);
            draft.reset();
            await load();
          },
        },
      ],
    );
  };

  const exerciseCountLabel = `${exercises.length} ${exercises.length === 1 ? 'exercício' : 'exercícios'}`;
  const metaLine = `${exerciseCountLabel} · ${workout.defaultSets} séries · ${formatRestTime(workout.defaultRestSeconds)} descanso`;

  return (
    <SafeAreaView style={styles.container}>
      <ReorderableList
        data={exercises}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={renderItem}
        onReorder={onReorder}
        ListHeaderComponent={
          <>
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <Text style={styles.headerLabel}>Treino</Text>
                <View style={[styles.swatch, { backgroundColor: workout.color }]} />
              </View>
              <Text style={[styles.headerName, { color: workout.color }]} numberOfLines={2}>
                {workout.name}
              </Text>
              <Text style={styles.headerMeta}>{metaLine}</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Exercícios{exercises.length > 0 ? ` (${exercises.length})` : ''}
            </Text>
            <View style={styles.listTopSpacer} />
          </>
        }
        ListFooterComponent={
          <Pressable onPress={onAddExercise} style={[styles.addRow, styles.addRowCard]}>
            <MaterialIcons name="add" size={22} color={workout.color} />
            <Text style={[styles.addRowText, { color: workout.color }]}>
              Adicionar exercício
            </Text>
          </Pressable>
        }
      />

      <View style={styles.footer}>
        <Button
          label="Iniciar treino"
          onPress={onStart}
          style={{ ...styles.cta, backgroundColor: workout.color }}
          disabled={exercises.length === 0}
        />
      </View>

      <SelectPlaylistModal
        visible={playlistModalVisible}
        onClose={() => setPlaylistModalVisible(false)}
        onSelect={onPlaylistSelected}
      />
    </SafeAreaView>
  );
}

interface DraggableRowProps {
  name: string;
  info: string;
  onPress: () => void;
  onDelete: () => void;
}

function DraggableRow({ name, info, onPress, onDelete }: DraggableRowProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();
  return (
    <WorkoutPreviewExerciseRow
      name={name}
      info={info}
      isActive={isActive}
      onPress={onPress}
      onDelete={onDelete}
      onDragStart={drag}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loading: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLabel: { ...typography.caption, color: colors.textSecondary },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  headerName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerMeta: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  listTopSpacer: { height: spacing.xs },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
  },
  addRowCard: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  addRowText: { fontSize: 15, fontWeight: '700' },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff10',
  },
  cta: { borderRadius: 999 },
  headerBtn: { paddingHorizontal: spacing.sm },
});
