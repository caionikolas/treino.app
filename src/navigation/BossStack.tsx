import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BossListScreen } from '@/screens/boss/BossListScreen';
import { BossDetailScreen } from '@/screens/boss/BossDetailScreen';
import { colors } from '@/theme';

export type BossStackParamList = {
  BossList: undefined;
  BossDetail: { id: string };
};

const Stack = createNativeStackNavigator<BossStackParamList>();

export function BossStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="BossList" component={BossListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BossDetail" component={BossDetailScreen} options={{ title: 'Chefão' }} />
    </Stack.Navigator>
  );
}
