import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutListScreen } from '@/screens/workout/WorkoutListScreen';
import { WorkoutFormScreen } from '@/screens/workout/WorkoutFormScreen';
import { ExercisePickerScreen } from '@/screens/workout/ExercisePickerScreen';
import { ExerciseInWorkoutScreen } from '@/screens/workout/ExerciseInWorkoutScreen';
import { colors } from '@/theme';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
  WorkoutPreview: { id: string };
  WorkoutExecution: undefined;
  WorkoutSummary: undefined;
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export function WorkoutStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutListScreen}
        options={{ title: 'Treinos' }}
      />
      <Stack.Screen
        name="WorkoutForm"
        component={WorkoutFormScreen}
        options={{ title: 'Treino' }}
      />
      <Stack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ title: 'Adicionar exercícios' }}
      />
      <Stack.Screen
        name="ExerciseInWorkout"
        component={ExerciseInWorkoutScreen}
        options={{ title: 'Configurar' }}
      />
    </Stack.Navigator>
  );
}
