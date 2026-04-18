import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ExerciseStack } from './ExerciseStack';
import { WorkoutStack } from './WorkoutStack';
import { ComingSoonScreen } from '@/screens/placeholders/ComingSoonScreen';
import { colors } from '@/theme';

const Tab = createBottomTabNavigator();

const HistoryPlaceholder = () => <ComingSoonScreen title="Histórico" />;
const MusicPlaceholder = () => <ComingSoonScreen title="Música" />;

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
              Exercises: 'sports-gymnastics',
              History: 'history',
              Music: 'music-note',
            };
            return <Icon name={iconByRoute[route.name] ?? 'circle'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Workouts" component={WorkoutStack} options={{ title: 'Treinos' }} />
        <Tab.Screen name="Exercises" component={ExerciseStack} options={{ title: 'Exercícios' }} />
        <Tab.Screen name="History" component={HistoryPlaceholder} options={{ title: 'Histórico' }} />
        <Tab.Screen name="Music" component={MusicPlaceholder} options={{ title: 'Música' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
