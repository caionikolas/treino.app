import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable, Alert, BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutTimer, RestTimer, SetLogRow, ExerciseProgress } from '@/components/session';
import { Button, EmptyState } from '@/components/common';
import { MiniPlayer } from '@/components/music';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useIntervalTimer } from '@/hooks/useIntervalTimer';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import {
  showRestFinishedNotification,
  requestNotificationPermission,
  showWorkoutOngoing,
  cancelWorkoutOngoing,
} from '@/services/notificationService';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';
import { Vibration } from 'react-native';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutExecution'>;

export function WorkoutExecutionScreen({ navigation }: Props) {
  useKeepAwake();

  const startedAt = useActiveSessionStore(s => s.startedAt);
  const exercises = useActiveSessionStore(s => s.exercises);
  const currentExerciseIndex = useActiveSessionStore(s => s.currentExerciseIndex);
  const currentSetNumber = useActiveSessionStore(s => s.currentSetNumber);
  const restEndsAt = useActiveSessionStore(s => s.restEndsAt);
  const logSet = useActiveSessionStore(s => s.logSet);
  const nextExercise = useActiveSessionStore(s => s.nextExercise);
  const previousExercise = useActiveSessionStore(s => s.previousExercise);
  const skipExercise = useActiveSessionStore(s => s.skipExercise);
  const adjustRest = useActiveSessionStore(s => s.adjustRest);
  const skipRest = useActiveSessionStore(s => s.skipRest);
  const lastSetForExercise = useActiveSessionStore(s => s.lastSetForExercise);
  const isLastSetOfLastExercise = useActiveSessionStore(s => s.isLastSetOfLastExercise);
  const reset = useActiveSessionStore(s => s.reset);

  const currentExercise = exercises[currentExerciseIndex];

  const lastSet = currentExercise ? lastSetForExercise(currentExercise.exerciseId) : undefined;
  const defaultReps = lastSet ? String(lastSet.reps) : (currentExercise?.targetReps ?? '');
  const defaultWeight = lastSet?.weightKg != null ? String(lastSet.weightKg) : '0';

  const [weight, setWeight] = useState<string>(defaultWeight);
  const [reps, setReps] = useState<string>(defaultReps);

  useEffect(() => {
    const last = currentExercise ? lastSetForExercise(currentExercise.exerciseId) : undefined;
    setReps(last ? String(last.reps) : (currentExercise?.targetReps ?? ''));
    setWeight(last?.weightKg != null ? String(last.weightKg) : '0');
  }, [currentExerciseIndex, currentSetNumber, currentExercise, lastSetForExercise]);

  useEffect(() => {
    requestNotificationPermission();
    return () => {
      cancelWorkoutOngoing();
    };
  }, []);

  useEffect(() => {
    if (!startedAt || !currentExercise) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      showWorkoutOngoing({ exerciseName: currentExercise.exerciseName, elapsedSec: elapsed });
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [startedAt, currentExerciseIndex, currentExercise]);

  const [now, setNow] = useState(Date.now());
  useIntervalTimer(500, setNow, restEndsAt != null);

  const [hasNotified, setHasNotified] = useState(false);
  const secondsLeft = restEndsAt != null ? Math.ceil((restEndsAt - now) / 1000) : 0;

  useEffect(() => {
    if (restEndsAt != null && now >= restEndsAt && !hasNotified) {
      Vibration.vibrate(300);
      if (currentExercise) {
        showRestFinishedNotification(currentExercise.exerciseName, currentSetNumber);
      }
      setHasNotified(true);
      skipRest();
    }
    if (restEndsAt == null) {
      setHasNotified(false);
    }
  }, [restEndsAt, now, hasNotified, currentExercise, currentSetNumber, skipRest]);

  const onConfirmSet = () => {
    const repsNum = parseInt(reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    const weightNum = weight.trim() === '' ? null : parseFloat(weight);
    const weightFinal = weightNum == null || isNaN(weightNum) ? null : weightNum;

    if (isLastSetOfLastExercise()) {
      logSet(repsNum, weightFinal);
      navigation.navigate('WorkoutSummary');
    } else {
      logSet(repsNum, weightFinal);
    }
  };

  const openExitMenu = () => {
    Alert.alert(
      'Sair do treino?',
      undefined,
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Finalizar agora',
          onPress: () => navigation.navigate('WorkoutSummary'),
        },
        {
          text: 'Descartar treino',
          style: 'destructive',
          onPress: () => {
            reset();
            navigation.popToTop();
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={openExitMenu} style={styles.headerBtn}>
          <Icon name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
      headerTitle: () => (startedAt ? <WorkoutTimer startedAt={startedAt} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, startedAt]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      openExitMenu();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentExercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Nenhum exercício na sessão" />
        <Button label="Sair" onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ExerciseProgress
          exerciseName={currentExercise.exerciseName}
          currentSet={currentSetNumber}
          totalSets={currentExercise.targetSets}
          targetReps={currentExercise.targetReps}
        />

        <View style={styles.mediaPlaceholder}>
          <Icon name="fitness-center" size={64} color={colors.textSecondary} />
        </View>

        {restEndsAt != null && secondsLeft > 0 ? (
          <RestTimer
            secondsRemaining={secondsLeft}
            onAdjust={adjustRest}
            onSkip={skipRest}
          />
        ) : (
          <SetLogRow
            weight={weight}
            reps={reps}
            onWeightChange={setWeight}
            onRepsChange={setReps}
            onConfirm={onConfirmSet}
            disabled={parseInt(reps, 10) <= 0 || isNaN(parseInt(reps, 10))}
          />
        )}

        <View style={styles.nav}>
          <Button
            label="◀ Anterior"
            variant="ghost"
            onPress={previousExercise}
            disabled={currentExerciseIndex === 0}
            style={styles.navBtn}
          />
          <Text style={styles.navCount}>
            {currentExerciseIndex + 1}/{exercises.length}
          </Text>
          <Button
            label="Próximo ▶"
            variant="ghost"
            onPress={nextExercise}
            disabled={currentExerciseIndex >= exercises.length - 1}
            style={styles.navBtn}
          />
        </View>

        <Button
          label="Pular exercício"
          variant="ghost"
          onPress={skipExercise}
          style={styles.skipBtn}
        />
      </ScrollView>
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerBtn: { paddingHorizontal: spacing.sm },
  mediaPlaceholder: {
    aspectRatio: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  navBtn: { flex: 1 },
  navCount: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.md },
  skipBtn: { marginTop: spacing.sm },
});
