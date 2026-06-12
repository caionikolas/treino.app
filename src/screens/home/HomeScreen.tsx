import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors, spacing } from '@/theme';
import { HomeStackParamList } from '@/navigation/HomeStack';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const WEEKDAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function getMondayBasedWeek(today: Date): Date[] {
  const day = today.getDay();
  const offsetToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offsetToMon);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const username = useSettingsStore(s => s.username);
  const loadSettings = useSettingsStore(s => s.load);
  const summaries = useWorkoutStore(s => s.summaries);
  const loadWorkouts = useWorkoutStore(s => s.load);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadWorkouts();
    }, [loadSettings, loadWorkouts]),
  );

  const week = useMemo(() => getMondayBasedWeek(new Date()), []);
  const todayKey = new Date().toDateString();

  const recentWorkouts = useMemo(
    () => [...summaries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [summaries],
  );

  const greetName = username.trim() || 'atleta';

  const goWorkout = (workoutId: string) => {
    (navigation.getParent() as any)?.navigate('Workouts', {
      screen: 'WorkoutPreview',
      params: { id: workoutId },
      initial: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingHi}>Olá, </Text>
            <Text style={styles.greetingName}>{greetName}</Text>
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.gearBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Icon name="settings" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {week.map(d => {
            const isToday = d.toDateString() === todayKey;
            return (
              <View key={d.toISOString()} style={[styles.dayCol, isToday && styles.dayColActive]}>
                <Text style={[styles.dayNum, isToday && styles.dayNumActive]}>{d.getDate()}</Text>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                  {WEEKDAY_ABBR[d.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Treinos recentes</Text>
        {recentWorkouts.length === 0 ? (
          <Text style={styles.empty}>Nenhum treino criado ainda.</Text>
        ) : (
          recentWorkouts.map(w => (
            <Pressable
              key={w.id}
              onPress={() => goWorkout(w.id)}
              style={({ pressed }) => [styles.recentCard, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.recentIconCircle, { backgroundColor: w.color }]}>
                <Icon name="fitness-center" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentLabel}>Treino</Text>
                <Text style={styles.recentName} numberOfLines={1}>{w.name}</Text>
              </View>
              <Text style={styles.recentMeta} numberOfLines={1}>
                {w.exerciseCount} {w.exerciseCount === 1 ? 'exercício' : 'exercícios'}
              </Text>
              <Icon name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  greeting: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  greetingHi: { color: colors.textPrimary },
  greetingName: { color: colors.textSecondary, fontWeight: '700' },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2, borderRadius: 16 },
  dayColActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayNum: { color: colors.textSecondary, fontSize: 18, fontWeight: '700' },
  dayNumActive: { color: colors.textPrimary },
  dayLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  dayLabelActive: { color: colors.textSecondary },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  recentCard: {
    backgroundColor: '#1F1F36',
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  recentIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  recentLabel: { color: '#FFFFFF', opacity: 0.55, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  recentName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  recentMeta: { color: '#FFFFFF', opacity: 0.65, fontSize: 11, fontWeight: '600', marginRight: 6 },
  empty: { color: colors.textSecondary, fontStyle: 'italic' },
});
