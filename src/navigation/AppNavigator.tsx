import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ExerciseStack } from './ExerciseStack';
import { WorkoutStack } from './WorkoutStack';
import { PlanStack } from './PlanStack';
import { HistoryStack } from './HistoryStack';
import { MusicStack } from './MusicStack';
import { colors } from '@/theme';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.primary,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.primary, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ color, size }) => {
            const iconByRoute: Record<string, string> = {
              Workouts: 'fitness-center',
              Plans: 'event-note',
              Exercises: 'sports-gymnastics',
              History: 'history',
              Music: 'music-note',
            };
            return <Icon name={iconByRoute[route.name] ?? 'circle'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Workouts" component={WorkoutStack} options={{ title: 'Treinos' }} />
        <Tab.Screen name="Plans" component={PlanStack} options={{ title: 'Planos' }} />
        <Tab.Screen name="Exercises" component={ExerciseStack} options={{ title: 'Exercícios' }} />
        <Tab.Screen name="History" component={HistoryStack} options={{ title: 'Histórico' }} />
        <Tab.Screen name="Music" component={MusicStack} options={{ title: 'Música' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
