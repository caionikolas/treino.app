import React from 'react';
import { View, StyleSheet } from 'react-native';
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

const ICON_BY_ROUTE: Record<string, string> = {
  Workouts: 'fitness-center',
  Plans: 'event-note',
  Exercises: 'sports-gymnastics',
  History: 'timer',
  Music: 'music-note',
};

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
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ focused }) => {
            const name = ICON_BY_ROUTE[route.name] ?? 'circle';
            if (focused) {
              return (
                <View style={styles.activePill}>
                  <Icon name={name} size={26} color={colors.primary} />
                </View>
              );
            }
            return <Icon name={name} size={26} color={colors.textSecondary} />;
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.primary,
    borderTopColor: colors.border,
    borderTopWidth: 0,
    height: 68,
    paddingTop: 10,
    paddingBottom: 10,
    elevation: 0,
  },
  tabItem: {
    justifyContent: 'center',
  },
  activePill: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
