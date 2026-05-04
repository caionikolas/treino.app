export function parseRepsToArray(reps: string, sets: number): number[] {
  if (sets <= 0) return [];
  const trimmed = reps.trim();
  let value: number;
  const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    value = parseInt(range[2], 10);
  } else {
    const single = parseInt(trimmed, 10);
    value = Number.isFinite(single) ? single : 10;
  }
  return Array.from({ length: sets }, () => value);
}
