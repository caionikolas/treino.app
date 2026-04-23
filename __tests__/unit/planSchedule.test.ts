import { isRestDay } from '@/utils/planSchedule';

// helper: creates a date on a specific weekday (0=Sunday .. 6=Saturday)
function dateOnWeekday(weekday: number): Date {
  const d = new Date(2026, 0, 4); // Jan 4 2026 = Sunday (weekday 0)
  d.setDate(d.getDate() + weekday);
  return d;
}

describe('isRestDay', () => {
  describe("frequency 'daily'", () => {
    it('returns false on a weekday', () => {
      expect(isRestDay('daily', dateOnWeekday(3))).toBe(false);
    });
    it('returns false on a weekend day', () => {
      expect(isRestDay('daily', dateOnWeekday(0))).toBe(false);
    });
  });

  describe("frequency 'mon_to_sat'", () => {
    it('returns true on Sunday', () => {
      expect(isRestDay('mon_to_sat', dateOnWeekday(0))).toBe(true);
    });
    it('returns false Monday through Saturday', () => {
      expect(isRestDay('mon_to_sat', dateOnWeekday(1))).toBe(false); // Monday
      expect(isRestDay('mon_to_sat', dateOnWeekday(2))).toBe(false); // Tuesday
      expect(isRestDay('mon_to_sat', dateOnWeekday(3))).toBe(false); // Wednesday
      expect(isRestDay('mon_to_sat', dateOnWeekday(4))).toBe(false); // Thursday
      expect(isRestDay('mon_to_sat', dateOnWeekday(5))).toBe(false); // Friday
      expect(isRestDay('mon_to_sat', dateOnWeekday(6))).toBe(false); // Saturday
    });
  });

  describe("frequency 'mon_to_fri'", () => {
    it('returns true on Saturday and Sunday', () => {
      expect(isRestDay('mon_to_fri', dateOnWeekday(0))).toBe(true);
      expect(isRestDay('mon_to_fri', dateOnWeekday(6))).toBe(true);
    });
    it('returns false Monday through Friday', () => {
      expect(isRestDay('mon_to_fri', dateOnWeekday(1))).toBe(false); // Monday
      expect(isRestDay('mon_to_fri', dateOnWeekday(2))).toBe(false); // Tuesday
      expect(isRestDay('mon_to_fri', dateOnWeekday(3))).toBe(false); // Wednesday
      expect(isRestDay('mon_to_fri', dateOnWeekday(4))).toBe(false); // Thursday
      expect(isRestDay('mon_to_fri', dateOnWeekday(5))).toBe(false); // Friday
    });
  });
});
