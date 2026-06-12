import { Boss } from '@/types/boss';

export const BOSSES: Boss[] = [
  {
    id: 'boss_pull_up',
    name: 'Pull-up',
    icon: 'fitness-center',
    color: '#3282B8',
    description: 'Domine a barra: da escápula ao pull-up completo.',
    orderIndex: 0,
    progressions: [
      { id: 'pull_up_scapula', bossId: 'boss_pull_up', orderIndex: 0, name: 'Progressão de escápula', kind: 'reps' },
      { id: 'pull_up_australian', bossId: 'boss_pull_up', orderIndex: 1, name: 'Australian Pull-up', kind: 'reps' },
      { id: 'pull_up_negative', bossId: 'boss_pull_up', orderIndex: 2, name: 'Negativa de Pull-up', kind: 'reps' },
      { id: 'pull_up_full', bossId: 'boss_pull_up', orderIndex: 3, name: 'Pull-up', kind: 'reps' },
    ],
  },
];

export function findBoss(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}
