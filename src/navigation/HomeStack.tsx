import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { SettingsScreen } from '@/screens/home/SettingsScreen';
import { colors } from '@/theme';

export type HomeStackParamList = {
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Configurações' }}
      />
    </Stack.Navigator>
  );
}
