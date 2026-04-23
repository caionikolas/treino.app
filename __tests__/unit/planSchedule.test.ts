import { isRestDay } from '@/utils/planSchedule';

// helper: cria data num dia da semana específico (0=domingo .. 6=sábado)
function dateOnWeekday(weekday: number): Date {
  const d = new Date(2026, 0, 4); // 4 jan 2026 = domingo
  d.setDate(d.getDate() + weekday);
  return d;
}

describe('isRestDay', () => {
  describe("frequency 'daily'", () => {
    it('returns false for every day of the week', () => {
      for (let w = 0; w < 7; w++) {
        expect(isRestDay('daily', dateOnWeekday(w))).toBe(false);
      }
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
