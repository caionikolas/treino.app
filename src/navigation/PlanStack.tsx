import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlanListScreen } from '@/screens/plan/PlanListScreen';
import { PlanFormScreen } from '@/screens/plan/PlanFormScreen';
import { colors } from '@/theme';

export type PlanStackParamList = {
  PlanList: undefined;
  PlanForm: { mode: 'new' } | { mode: 'edit'; id: string };
  PlanWorkoutPicker: { planId: string };
  PlanDetail: { id: string };
};

const Stack = createNativeStackNavigator<PlanStackParamList>();

export function PlanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="PlanList"
        component={PlanListScreen}
        options={{ title: 'Planos' }}
      />
      <Stack.Screen name="PlanForm" component={PlanFormScreen} options={{ title: 'Plano' }} />
    </Stack.Navigator>
  );
}
