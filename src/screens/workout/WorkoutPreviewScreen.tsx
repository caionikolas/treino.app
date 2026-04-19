import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, EmptyState } from '@/components/common';
import { SelectPlaylistModal } from '@/components/music';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { playlistRepository } from '@/database/repositories/playlistRepository';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useMusicLibraryStore } from '@/store/useMusicLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { Workout, WorkoutExercise } from '@/types/workout';
import { Track } from '@/types/music';
import { MuscleGroupKey, labelForMuscleGroup } from '@/constants/muscleGroups';
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

  useEffect(() => {
    (async () => {
      const result = await workoutRepository.findById(id);
      if (result) {
        setWorkout(result.workout);
        setExercises(result.exercises);
      }
      setLoading(false);
    })();
  }, [id]);

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
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    start(workout.id, enriched);
    navigation.navigate('WorkoutExecution');
  };

  const onStart = () => {
    setPlaylistModalVisible(true);
  };

  const onPlaylistSelected = async (playlistId: string | null) => {
    setPlaylistModalVisible(false);
    if (playlistId) {
      const result = await playlistRepository.findById(playlistId);
      if (result && result.tracks.length > 0) {
        const mapped: Track[] = result.tracks
          .map(pt => {
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

  const onEdit = () => {
    navigation.navigate('WorkoutForm', { mode: 'edit', id: workout.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: workout.color }]}>
          <Text style={styles.name}>{workout.name}</Text>
          <Text style={styles.subtitle}>
            {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Exercícios</Text>
        {exercises.map((e, i) => {
          const info = allExercises.find(x => x.id === e.exerciseId);
          return (
            <Card key={e.id} style={styles.itemCard}>
              <Text style={styles.itemName} numberOfLines={1}>
                {i + 1}. {info?.name ?? e.exerciseId}
              </Text>
              <Text style={styles.itemSub}>
                {labelForMuscleGroup(info?.muscleGroup ?? '')} • {e.sets}x{e.reps} • {e.restSeconds}s
              </Text>
            </Card>
          );
        })}

        <View style={styles.actions}>
          <Button label="Editar" variant="secondary" onPress={onEdit} style={styles.actionBtn} />
          <Button label="Iniciar treino" onPress={onStart} style={styles.actionBtn} disabled={exercises.length === 0} />
        </View>
      </ScrollView>

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
  loading: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  header: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  name: { ...typography.title, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { ...typography.body, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  itemCard: { marginBottom: spacing.sm },
  itemName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  itemSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: { flex: 1 },
});
