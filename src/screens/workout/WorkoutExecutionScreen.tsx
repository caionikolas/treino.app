import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, Text, Pressable, Alert, BackHandler,
  useWindowDimensions, ScrollView,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetLogRow } from '@/components/session';
import { EmptyState, Button } from '@/components/common';
import { ExerciseMedia } from '@/components/exercise';
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

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutExecution'>;

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function WorkoutExecutionScreen({ navigation }: Props) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const mediaHeight = Math.max(240, Math.round(height * 0.38));

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
  const adjustTargetSets = useActiveSessionStore(s => s.adjustTargetSets);
  const loggedSets = useActiveSessionStore(s => s.loggedSets);
  const lastSetForExercise = useActiveSessionStore(s => s.lastSetForExercise);
  const isLastSetOfLastExercise = useActiveSessionStore(s => s.isLastSetOfLastExercise);
  const reset = useActiveSessionStore(s => s.reset);

  const currentExercise = exercises[currentExerciseIndex];
  const completedForCurrent = currentExercise
    ? loggedSets.filter(s => s.exerciseId === currentExercise.exerciseId).length
    : 0;
  const totalSetsPlanned = exercises.reduce((acc, e) => acc + e.targetSets, 0);
  const completionPct = totalSetsPlanned > 0
    ? Math.round((loggedSets.length / totalSetsPlanned) * 100)
    : 0;

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
    return () => { cancelWorkoutOngoing(); };
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
  useIntervalTimer(500, setNow, true);

  const [hasNotified, setHasNotified] = useState(false);
  const isResting = restEndsAt != null;
  const secondsLeft = isResting ? Math.ceil((restEndsAt - now) / 1000) : 0;
  const totalElapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  useEffect(() => {
    if (restEndsAt != null && now >= restEndsAt && !hasNotified) {
      Vibration.vibrate(300);
      if (currentExercise) {
        showRestFinishedNotification(currentExercise.exerciseName, currentSetNumber);
      }
      setHasNotified(true);
      skipRest();
    }
    if (restEndsAt == null) setHasNotified(false);
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
    Alert.alert('Sair do treino?', undefined, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Finalizar agora', onPress: () => navigation.navigate('WorkoutSummary') },
      {
        text: 'Descartar treino', style: 'destructive',
        onPress: () => { reset(); navigation.popToTop(); },
      },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  const canConfirm = !isResting && parseInt(reps, 10) > 0 && !isNaN(parseInt(reps, 10));

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.mediaArea, { height: mediaHeight }]}>
        <ExerciseMedia
          filename={currentExercise.mediaFilename}
          size={width}
          paused={false}
        />
        <View style={styles.mediaOverlay} pointerEvents="box-none">
          <View style={styles.overlayTopRow}>
            <View style={styles.overlayBadge}>
              <Icon name="format-list-bulleted" size={16} color={colors.textPrimary} />
              <Text style={styles.overlayBadgeText}>
                {currentExerciseIndex + 1}/{exercises.length}
              </Text>
            </View>
            <Pressable onPress={openExitMenu} style={styles.overlayCloseBtn}>
              <Icon name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.panelLabel}>
          {isResting ? 'DESCANSO' : 'EM EXECUÇÃO'}
        </Text>
        <Text style={styles.panelTitle} numberOfLines={1}>
          {isResting ? `Próximo: ${currentExercise.exerciseName}` : currentExercise.exerciseName}
        </Text>

        <View style={styles.setEditor}>
          <Text style={styles.panelSubtitle}>
            Série {currentSetNumber} de {currentExercise.targetSets} · {currentExercise.targetReps} reps
          </Text>
          <View style={styles.setEditorBtns}>
            <Pressable
              onPress={() => adjustTargetSets(-1)}
              style={({ pressed }) => [styles.setAdjBtn, pressed && styles.pressed]}
            >
              <Icon name="remove" size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => adjustTargetSets(1)}
              style={({ pressed }) => [styles.setAdjBtn, pressed && styles.pressed]}
            >
              <Icon name="add" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.dotsRow}>
          {Array.from({ length: currentExercise.targetSets }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < completedForCurrent && styles.dotDone,
                i === completedForCurrent && !isResting && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.clockRow}>
          <Text style={[styles.clock, isResting && { color: colors.accent }]}>
            {isResting ? formatMmSs(secondsLeft) : formatMmSs(totalElapsed)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatMmSs(totalElapsed)}</Text>
            <Text style={styles.statLabel}>TEMPO TOTAL</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completionPct}%</Text>
            <Text style={styles.statLabel}>CONCLUÍDO</Text>
          </View>
        </View>

        {isResting ? (
          <View style={styles.actionRow}>
            <CircleBtn icon="remove" onPress={() => adjustRest(-30)} />
            <CircleBtn icon="play-arrow" onPress={skipRest} primary large />
            <CircleBtn icon="add" onPress={() => adjustRest(30)} />
          </View>
        ) : (
          <View style={styles.setLogWrapper}>
            <SetLogRow
              weight={weight}
              reps={reps}
              onWeightChange={setWeight}
              onRepsChange={setReps}
              onConfirm={onConfirmSet}
              disabled={!canConfirm}
            />
          </View>
        )}

        <View style={styles.navRow}>
          <CircleBtn
            icon="skip-previous"
            onPress={previousExercise}
            disabled={currentExerciseIndex === 0}
          />
          <Pressable onPress={skipExercise} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Pular exercício</Text>
          </Pressable>
          <CircleBtn
            icon="skip-next"
            onPress={nextExercise}
            disabled={currentExerciseIndex >= exercises.length - 1}
          />
        </View>
      </ScrollView>
      <MiniPlayer />
    </SafeAreaView>
  );
}

function CircleBtn({
  icon,
  onPress,
  disabled,
  primary,
  large,
}: {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  large?: boolean;
}) {
  const size = large ? 72 : 48;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: primary ? colors.accent : colors.primaryLight,
          alignItems: 'center', justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <Icon name={icon} size={large ? 32 : 22} color={primary ? colors.primary : colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mediaArea: { width: '100%', backgroundColor: colors.primaryLight, overflow: 'hidden' },
  mediaOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  overlayTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  overlayBadgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  overlayCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
  },
  panelContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  panelLabel: {
    ...typography.caption,
    color: colors.accent,
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 11,
  },
  panelTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
  },
  panelSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  setEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setEditorBtns: { flexDirection: 'row', gap: 8 },
  setAdjBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primaryLight,
  },
  dotDone: { backgroundColor: colors.accent },
  dotActive: { backgroundColor: colors.accent, opacity: 0.5 },
  clockRow: { alignItems: 'center', marginTop: spacing.sm },
  clock: {
    color: colors.textPrimary,
    fontSize: 52,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: { ...typography.body, color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  statLabel: { ...typography.caption, color: colors.textSecondary, letterSpacing: 1, fontSize: 10 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  setLogWrapper: { marginTop: spacing.sm },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  skipLink: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skipLinkText: { ...typography.body, color: colors.textSecondary, textDecorationLine: 'underline' },
});
