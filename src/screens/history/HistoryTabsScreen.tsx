import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { HistoryCalendarScreen } from './HistoryCalendarScreen';
import { StatsScreen } from './StatsScreen';
import { colors, typography } from '@/theme';

const Tab = createMaterialTopTabNavigator();

export function HistoryTabsScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.primary },
        tabBarIndicatorStyle: { backgroundColor: colors.accent },
        tabBarLabelStyle: { ...typography.body, fontWeight: '600', textTransform: 'none' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Calendar" component={HistoryCalendarScreen} options={{ title: 'Histórico' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Estatísticas' }} />
    </Tab.Navigator>
  );
}
