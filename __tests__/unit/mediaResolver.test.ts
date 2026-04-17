import { resolveMedia } from '@/database/mediaResolver';

describe('resolveMedia', () => {
  it('returns null for null filename', () => {
    expect(resolveMedia(null)).toBeNull();
  });

  it('returns null for unknown filename', () => {
    expect(resolveMedia('does_not_exist.mp4')).toBeNull();
  });

  it('returns a numeric require id for a known filename', () => {
    expect(typeof resolveMedia('dumbbell_bench_press.mp4')).toBe('number');
  });
});
