import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ExerciseStack } from './ExerciseStack';
import { WorkoutStack } from './WorkoutStack';
import { BossStack } from './BossStack';
import { HistoryStack } from './HistoryStack';
import { MusicStack } from './MusicStack';
import { HomeStack } from './HomeStack';
import { colors } from '@/theme';

const Tab = createBottomTabNavigator();

function AnimatedTabIcon({ name, focused }: { name: string; focused: boolean }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(233, 69, 96, 0)', colors.accent],
  });

  return (
    <Animated.View style={[styles.activePill, { backgroundColor }]}>
      <Icon name={name} size={26} color={focused ? colors.primary : colors.textSecondary} />
    </Animated.View>
  );
}

const ICON_BY_ROUTE: Record<string, string> = {
  Home: 'home',
  Workouts: 'fitness-center',
  Plans: 'emoji-events',
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
          tabBarButton: (props) => (
            <Pressable
              onPress={props.onPress}
              onLongPress={props.onLongPress}
              accessibilityRole="button"
              accessibilityState={props.accessibilityState}
              android_ripple={null}
              style={styles.tabButton}
            >
              {props.children}
            </Pressable>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name={ICON_BY_ROUTE[route.name] ?? 'circle'}
              focused={focused}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Início' }} />
        <Tab.Screen name="Workouts" component={WorkoutStack} options={{ title: 'Treinos' }} />
        <Tab.Screen name="Plans" component={BossStack} options={{ title: 'Chefões' }} />
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
    height: 84,
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 6,
    elevation: 0,
  },
  tabItem: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
