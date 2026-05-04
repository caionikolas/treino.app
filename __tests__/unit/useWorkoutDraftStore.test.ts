jest.mock('@/database/connection', () => ({
  getDb: () => {
    throw new Error('db not used in this test');
  },
}));

import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';

describe('useWorkoutDraftStore', () => {
  beforeEach(() => {
    useWorkoutDraftStore.getState().reset();
  });

  it('loadNew initializes with empty state and default color', () => {
    useWorkoutDraftStore.getState().loadNew();
    const s = useWorkoutDraftStore.getState();
    expect(s.id).toBeNull();
    expect(s.name).toBe('');
    expect(s.color).toBe('#E94560');
    expect(s.defaultSets).toBe(3);
    expect(s.defaultRestSeconds).toBe(90);
    expect(s.exercises).toEqual([]);
    expect(s.isDirty()).toBe(false);
  });

  it('addExercise appends with default reps array of length defaultSets', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('ex-1', 'Supino', 'chest');
    const ex = useWorkoutDraftStore.getState().exercises[0];
    expect(ex).toEqual({
      exerciseId: 'ex-1',
      exerciseName: 'Supino',
      muscleGroup: 'chest',
      repsPerSet: [12, 12, 12],
      restSeconds: 90,
      restEnabled: true,
      warmupEnabled: false,
      warmupReps: null,
    });
  });

  it('updateDefaultSets affects new exercises only', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.updateDefaultSets(5);
    s.addExercise('ex-1', 'Supino', 'chest');
    expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet.length).toBe(5);
  });

  it('hasExercise returns true/false correctly', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('ex-1', 'Supino', 'chest');
    expect(useWorkoutDraftStore.getState().hasExercise('ex-1')).toBe(true);
    expect(useWorkoutDraftStore.getState().hasExercise('ex-2')).toBe(false);
  });

  it('moveUp(0) is a no-op; moveDown(last) is a no-op', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');

    s.moveUp(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['a', 'b']);

    s.moveDown(1);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['a', 'b']);
  });

  it('moveUp(1) swaps items 0 and 1', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.moveUp(1);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b', 'a']);
  });

  it('moveDown(0) swaps items 0 and 1', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.moveDown(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b', 'a']);
  });

  it('removeExercise drops the item at index', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.removeExercise(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b']);
  });

  it('updateSetReps changes only the targeted set', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.updateSetReps(0, 1, 30);
    expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet).toEqual([12, 30, 12]);
  });

  it('addSet duplicates last reps value', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.updateSetReps(0, 2, 8);
    s.addSet(0);
    expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet).toEqual([12, 12, 8, 8]);
  });

  it('removeSet keeps at least one set', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.updateDefaultSets(1);
    s.addExercise('a', 'A', 'chest');
    s.removeSet(0, 0);
    expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet.length).toBe(1);
  });

  it('toggleWarmup defaults reps to 10', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.toggleWarmup(0);
    const ex = useWorkoutDraftStore.getState().exercises[0];
    expect(ex.warmupEnabled).toBe(true);
    expect(ex.warmupReps).toBe(10);
  });

  it('toggleWarmup off clears warmup reps', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.toggleWarmup(0);
    s.setWarmupReps(0, 8);
    s.toggleWarmup(0);
    const ex = useWorkoutDraftStore.getState().exercises[0];
    expect(ex.warmupEnabled).toBe(false);
    expect(ex.warmupReps).toBeNull();
  });

  it('toggleRest flips the rest enabled flag', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.toggleRest(0);
    expect(useWorkoutDraftStore.getState().exercises[0].restEnabled).toBe(false);
  });

  it('isDirty detects name, color, defaults and exercise changes', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    expect(s.isDirty()).toBe(false);

    s.updateName('New Name');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().updateColor('#00B894');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().updateDefaultSets(5);
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().addExercise('a', 'A', 'chest');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);
  });
});
