import { exerciseRepository } from '@/database/repositories/exerciseRepository';
import { DEFAULT_EXERCISES } from './defaultExercises';

export async function runSeeds(): Promise<void> {
  if ((await exerciseRepository.count()) === 0) {
    await exerciseRepository.insertMany(DEFAULT_EXERCISES);
    console.log(`Seeded ${DEFAULT_EXERCISES.length} exercises`);
  }
}
