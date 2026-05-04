import { parseRepsToArray } from '../../src/utils/parseRepsToArray';

describe('parseRepsToArray', () => {
  it('repeats numeric reps for given sets count', () => {
    expect(parseRepsToArray('12', 4)).toEqual([12, 12, 12, 12]);
  });

  it('takes upper bound of "a-b" range', () => {
    expect(parseRepsToArray('8-12', 3)).toEqual([12, 12, 12]);
  });

  it('falls back to 10 for non-numeric reps', () => {
    expect(parseRepsToArray('até falha', 3)).toEqual([10, 10, 10]);
  });

  it('returns empty array when sets <= 0', () => {
    expect(parseRepsToArray('12', 0)).toEqual([]);
  });
});
