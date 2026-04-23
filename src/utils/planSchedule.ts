import { PlanFrequency } from '@/types/plan';

/**
 * Returns true if the given date is a rest day for the plan's frequency.
 * Sunday=0 ... Saturday=6 (JavaScript's getDay).
 */
export function isRestDay(frequency: PlanFrequency, date: Date): boolean {
  const day = date.getDay();
  switch (frequency) {
    case 'daily':
      return false;
    case 'mon_to_sat':
      return day === 0;
    case 'mon_to_fri':
      return day === 0 || day === 6;
  }
}
