// Mock DB-dependent modules so the pure computeAdvancement function can be tested in isolation
jest.mock('@/database/connection', () => ({ getDb: jest.fn() }));
jest.mock('@/database/repositories/planRepository', () => ({ planRepository: {} }));
jest.mock('@/database/repositories/sessionRepository', () => ({ sessionRepository: {} }));

import { computeAdvancement, ProgressInputSession } from '@/services/planProgressService';
import { Plan } from '@/types/plan';

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p1', name: 'P', description: null, color: '#000',
    frequency: 'daily', reminderEnabled: false, reminderTime: null,
    status: 'active', currentIndex: 0,
    startedAt: 1000, completedAt: null, lastAdvancedAt: 1000,
    createdAt: 1000, updatedAt: 1000,
    ...overrides,
  };
}

describe('computeAdvancement', () => {
  it('does not advance when there is no qualifying session', () => {
    const result = computeAdvancement(plan(), ['w1', 'w2'], []);
    expect(result.currentIndex).toBe(0);
    expect(result.status).toBe('active');
    expect(result.completedAt).toBeNull();
    expect(result.lastAdvancedAt).toBe(1000);
  });

  it('advances index by 1 when one matching session exists', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'w1', finishedAt: 2000 },
    ];
    const result = computeAdvancement(plan(), ['w1', 'w2'], sessions);
    expect(result.currentIndex).toBe(1);
    expect(result.lastAdvancedAt).toBe(2000);
    expect(result.status).toBe('active');
  });

  it('ignores sessions older than lastAdvancedAt', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'w1', finishedAt: 500 }, // before lastAdvancedAt=1000
    ];
    const result = computeAdvancement(plan(), ['w1', 'w2'], sessions);
    expect(result.currentIndex).toBe(0);
  });

  it('ignores sessions with non-matching workoutId', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'wX', finishedAt: 2000 },
    ];
    const result = computeAdvancement(plan(), ['w1', 'w2'], sessions);
    expect(result.currentIndex).toBe(0);
  });

  it('advances multiple steps in a row when consecutive sessions exist', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'w1', finishedAt: 2000 },
      { workoutId: 'w2', finishedAt: 3000 },
    ];
    const result = computeAdvancement(plan(), ['w1', 'w2', 'w3'], sessions);
    expect(result.currentIndex).toBe(2);
    expect(result.lastAdvancedAt).toBe(3000);
    expect(result.status).toBe('active');
  });

  it('completes the plan when last workout is consumed', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'w2', finishedAt: 4000 },
    ];
    const start = plan({ currentIndex: 1 });
    const result = computeAdvancement(start, ['w1', 'w2'], sessions);
    expect(result.currentIndex).toBe(2);
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBe(4000);
  });

  it('returns no-op when plan is not active', () => {
    const sessions: ProgressInputSession[] = [{ workoutId: 'w1', finishedAt: 2000 }];
    const result = computeAdvancement(plan({ status: 'idle' }), ['w1', 'w2'], sessions);
    expect(result.currentIndex).toBe(0);
    expect(result.status).toBe('idle');
  });

  it('uses 0 as cutoff when both lastAdvancedAt and startedAt are null', () => {
    const sessions: ProgressInputSession[] = [
      { workoutId: 'w1', finishedAt: 1 },
    ];
    const result = computeAdvancement(
      plan({ lastAdvancedAt: null, startedAt: null }),
      ['w1', 'w2'],
      sessions,
    );
    expect(result.currentIndex).toBe(1);
  });
});
