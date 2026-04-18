import { useActiveSessionStore } from '@/store/useActiveSessionStore';

describe('useActiveSessionStore', () => {
  beforeEach(() => {
    useActiveSessionStore.getState().reset();
  });

  const sampleExercises = [
    { exerciseId: 'ex-1', exerciseName: 'Supino', muscleGroup: 'chest' as const, sets: 3, reps: '12', restSeconds: 90 },
    { exerciseId: 'ex-2', exerciseName: 'Rosca', muscleGroup: 'biceps' as const, sets: 2, reps: '10', restSeconds: 60 },
  ];

  it('start initializes session state', () => {
    useActiveSessionStore.getState().start('w-1', sampleExercises);
    const s = useActiveSessionStore.getState();
    expect(s.sessionId).not.toBeNull();
    expect(s.workoutId).toBe('w-1');
    expect(s.startedAt).not.toBeNull();
    expect(s.exercises.length).toBe(2);
    expect(s.exercises[0].targetSets).toBe(3);
    expect(s.exercises[0].targetReps).toBe('12');
    expect(s.currentExerciseIndex).toBe(0);
    expect(s.currentSetNumber).toBe(1);
    expect(s.loggedSets).toEqual([]);
  });

  it('logSet adds set and advances setNumber', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    const afterOne = useActiveSessionStore.getState();
    expect(afterOne.loggedSets.length).toBe(1);
    expect(afterOne.loggedSets[0].reps).toBe(12);
    expect(afterOne.loggedSets[0].weightKg).toBe(80);
    expect(afterOne.currentSetNumber).toBe(2);
    expect(afterOne.currentExerciseIndex).toBe(0);
  });

  it('logSet advances to next exercise after last set', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.logSet(12, 80);
    s.logSet(12, 80);
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.currentSetNumber).toBe(1);
    expect(after.loggedSets.length).toBe(3);
  });

  it('nextExercise advances and resets setNumber to logged + 1', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.nextExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.currentSetNumber).toBe(1);
  });

  it('previousExercise goes back, setNumber resumes after existing logs', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.nextExercise();
    s.previousExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(0);
    expect(after.currentSetNumber).toBe(2);
  });

  it('skipExercise advances without logging', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.skipExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.loggedSets.length).toBe(0);
  });

  it('lastSetForExercise returns the most recent set of that exercise', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.logSet(10, 85);
    const last = useActiveSessionStore.getState().lastSetForExercise('ex-1');
    expect(last?.reps).toBe(10);
    expect(last?.weightKg).toBe(85);
  });

  it('adjustRest changes restEndsAt by delta seconds', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    const before = useActiveSessionStore.getState().restEndsAt!;
    s.adjustRest(30);
    const after = useActiveSessionStore.getState().restEndsAt!;
    expect(after - before).toBe(30_000);
  });

  it('skipRest clears restEndsAt', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().restEndsAt).not.toBeNull();
    s.skipRest();
    expect(useActiveSessionStore.getState().restEndsAt).toBeNull();
  });

  it('finalize produces session + sets with computed duration', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.setNotes('foi bom');
    const { session, sets } = s.finalize();
    expect(session.workoutId).toBe('w-1');
    expect(session.finishedAt).not.toBeNull();
    expect(session.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(session.notes).toBe('foi bom');
    expect(sets.length).toBe(1);
    expect(sets[0].reps).toBe(12);
  });

  it('isLastSetOfLastExercise returns true only at the very end', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', [sampleExercises[0]]);
    expect(s.isLastSetOfLastExercise()).toBe(false);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().isLastSetOfLastExercise()).toBe(false);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().isLastSetOfLastExercise()).toBe(true);
  });
});
