import { isRestDay } from '@/utils/planSchedule';

// helper: creates a date on a specific weekday (0=Sunday .. 6=Saturday)
function dateOnWeekday(weekday: number): Date {
  const d = new Date(2026, 0, 4); // 4 jan 2026 = domingo
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
      for (let w = 1; w <= 6; w++) {
        expect(isRestDay('mon_to_sat', dateOnWeekday(w))).toBe(false);
      }
    });
  });

  describe("frequency 'mon_to_fri'", () => {
    it('returns true on Saturday and Sunday', () => {
      expect(isRestDay('mon_to_fri', dateOnWeekday(0))).toBe(true);
      expect(isRestDay('mon_to_fri', dateOnWeekday(6))).toBe(true);
    });
    it('returns false Monday through Friday', () => {
      for (let w = 1; w <= 5; w++) {
        expect(isRestDay('mon_to_fri', dateOnWeekday(w))).toBe(false);
      }
    });
  });
});
