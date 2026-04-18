import { NavigatorScreenParams } from '@react-navigation/native';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
};

// Real implementation comes in later task
