import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryTabsScreen } from '@/screens/history/HistoryTabsScreen';
import { SessionDetailScreen } from '@/screens/history/SessionDetailScreen';
import { WorkoutExecutionScreen } from '@/screens/workout/WorkoutExecutionScreen';
import { WorkoutSummaryScreen } from '@/screens/workout/WorkoutSummaryScreen';
import { colors } from '@/theme';

export type HistoryStackParamList = {
  HistoryTabs: undefined;
  SessionDetail: { id: string };
  WorkoutExecution: undefined;
  WorkoutSummary: undefined;
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="HistoryTabs"
        component={HistoryTabsScreen}
        options={{ title: 'Histórico' }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Sessão' }}
      />
      <Stack.Screen
        name="WorkoutExecution"
        component={WorkoutExecutionScreen}
        options={{ title: 'Em andamento', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{ title: 'Resumo', gestureEnabled: false, headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
