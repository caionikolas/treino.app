import { buildBossView } from '@/services/bossProgressService';
import { Boss } from '@/types/boss';

function makeBoss(): Boss {
  return {
    id: 'b', name: 'Pull-up', icon: 'fitness-center', color: '#3282B8',
    description: null, orderIndex: 0,
    progressions: [
      { id: 'p0', bossId: 'b', orderIndex: 0, name: 'Escápula', kind: 'reps' },
      { id: 'p1', bossId: 'b', orderIndex: 1, name: 'Australian', kind: 'reps' },
      { id: 'p2', bossId: 'b', orderIndex: 2, name: 'Negativa', kind: 'reps' },
      { id: 'p3', bossId: 'b', orderIndex: 3, name: 'Pull-up', kind: 'reps' },
    ],
  };
}

describe('buildBossView', () => {
  it('1ª progressão desbloqueada; demais bloqueadas sem progresso', () => {
    const v = buildBossView(makeBoss(), {});
    expect(v.progressions[0].locked).toBe(false);
    expect(v.progressions[1].locked).toBe(true);
    expect(v.progressions[3].locked).toBe(true);
    expect(v.progressPoints).toBe(0);
    expect(v.maxPoints).toBe(12);
    expect(v.skillUnlocked).toBe(false);
    expect(v.mastered).toBe(false);
    expect(v.focusName).toBe('Escápula');
  });

  it('Aprendido (1) na anterior desbloqueia a próxima', () => {
    const v = buildBossView(makeBoss(), { p0: 1 });
    expect(v.progressions[1].locked).toBe(false);
    expect(v.progressions[2].locked).toBe(true);
    expect(v.progressPoints).toBe(1);
  });

  it('focusName é a 1ª desbloqueada e não masterizada', () => {
    const v = buildBossView(makeBoss(), { p0: 3, p1: 1 });
    expect(v.focusName).toBe('Australian');
  });

  it('marco skillUnlocked quando a última >= 1', () => {
    const v = buildBossView(makeBoss(), { p0: 1, p1: 1, p2: 1, p3: 1 });
    expect(v.skillUnlocked).toBe(true);
    expect(v.mastered).toBe(false);
  });

  it('marco mastered quando a última == 3; focusName null', () => {
    const v = buildBossView(makeBoss(), { p0: 3, p1: 3, p2: 3, p3: 3 });
    expect(v.mastered).toBe(true);
    expect(v.progressPoints).toBe(12);
    expect(v.focusName).toBeNull();
  });
});
