import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroupKey;
  category: CategoryKey;
  mediaFilename: string | null;
  instructions: string;
  createdAt: number;
}
