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
    expect(s.exercises).toEqual([]);
    expect(s.isDirty()).toBe(false);
  });

  it('addExercise appends with defaults 4x12 and 90s rest', () => {
    useWorkoutDraftStore.getState().loadNew();
    useWorkoutDraftStore.getState().addExercise('ex-1', 'Supino', 'chest');
    const s = useWorkoutDraftStore.getState();
    expect(s.exercises.length).toBe(1);
    expect(s.exercises[0]).toEqual({
      exerciseId: 'ex-1',
      exerciseName: 'Supino',
      muscleGroup: 'chest',
      sets: 4,
      reps: '12',
      restSeconds: 90,
    });
  });

  it('hasExercise returns true/false correctly', () => {
    useWorkoutDraftStore.getState().loadNew();
    useWorkoutDraftStore.getState().addExercise('ex-1', 'Supino', 'chest');
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

  it('updateExerciseConfig patches only specified fields', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.updateExerciseConfig(0, { sets: 5, restSeconds: 120 });
    const ex = useWorkoutDraftStore.getState().exercises[0];
    expect(ex.sets).toBe(5);
    expect(ex.reps).toBe('12');
    expect(ex.restSeconds).toBe(120);
  });

  it('isDirty detects name, color, and exercise changes', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    expect(s.isDirty()).toBe(false);

    s.updateName('New Name');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().updateColor('#00B894');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().addExercise('a', 'A', 'chest');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);
  });
});
