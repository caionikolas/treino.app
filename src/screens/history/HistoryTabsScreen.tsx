import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { HistoryCalendarScreen } from './HistoryCalendarScreen';
import { StatsScreen } from './StatsScreen';
import { colors, spacing, typography } from '@/theme';

type Tab = 'calendar' | 'stats';

export function HistoryTabsScreen(props: any) {
  const [tab, setTab] = useState<Tab>('calendar');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TabBtn label="Histórico" active={tab === 'calendar'} onPress={() => setTab('calendar')} />
        <TabBtn label="Estatísticas" active={tab === 'stats'} onPress={() => setTab('stats')} />
      </View>
      <View style={styles.content}>
        {tab === 'calendar' ? (
          <HistoryCalendarScreen {...props} />
        ) : (
          <StatsScreen />
        )}
      </View>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.tabPressed]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabPressed: { opacity: 0.7 },
  tabLabel: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: colors.accent },
  content: { flex: 1 },
});
