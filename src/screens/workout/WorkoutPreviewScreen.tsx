import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, EmptyState, SettingRow } from '@/components/common';
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

  const exerciseCountLabel = `${exercises.length} ${exercises.length === 1 ? 'exercício' : 'exercícios'}`;
  const metaLine = `${exerciseCountLabel} · ${workout.defaultSets} séries · ${formatRestTime(workout.defaultRestSeconds)} descanso`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <View style={styles.listCard}>
          {exercises.map((e, i) => {
            const info = allExercises.find(x => x.id === e.exerciseId);
            return (
              <SettingRow
                key={e.id}
                label={`${i + 1}. ${info?.name ?? e.exerciseId}`}
                value={`${e.sets}×${e.reps}`}
                onPress={() => onTapExercise(i)}
              />
            );
          })}
          <SettingRow icon="add" label="Adicionar exercício" onPress={onAddExercise} />
        </View>
      </ScrollView>

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
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff10',
  },
  cta: { borderRadius: 999 },
  headerBtn: { paddingHorizontal: spacing.sm },
});
