import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BossStackParamList } from '@/navigation/BossStack';
import { MasteryLevel, ProgressionView } from '@/types/boss';
import { useBossStore } from '@/store/useBossStore';
import { ProgressionRow } from '@/components/boss/ProgressionRow';
import { MasteryLevelSheet } from '@/components/boss/MasteryLevelSheet';
import { EmptyState } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

type Nav = NativeStackNavigationProp<BossStackParamList, 'BossDetail'>;
type Rt = RouteProp<BossStackParamList, 'BossDetail'>;

export function BossDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { id } = route.params;

  const load = useBossStore(s => s.load);
  const setLevel = useBossStore(s => s.setLevel);
  const view = useBossStore(s => s.views.find(v => v.boss.id === id));

  const [sheetProg, setSheetProg] = useState<ProgressionView | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: view?.boss.name ?? 'Chefão' });
  }, [navigation, view]);

  if (!view) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Chefão não encontrado" />
      </SafeAreaView>
    );
  }

  const { boss, progressions, progressPoints, maxPoints } = view;
  const pct = maxPoints > 0 ? Math.round((progressPoints / maxPoints) * 100) : 0;

  const onSelect = async (level: MasteryLevel) => {
    if (!sheetProg) {
      return;
    }
    const before = useBossStore.getState().getView(id);
    await setLevel(sheetProg.id, level);
    const after = useBossStore.getState().getView(id);
    setSheetProg(null);
    if (before && after) {
      if (!before.mastered && after.mastered) {
        Alert.alert('🏆 Chefão dominado!', `Você masterizou o ${boss.name}!`);
      } else if (!before.skillUnlocked && after.skillUnlocked) {
        Alert.alert('🎉 Skill desbloqueada!', `Seu primeiro ${boss.name}!`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={[styles.headerName, { color: boss.color }]} numberOfLines={2}>
            {boss.name}
          </Text>
          <Text style={styles.headerMeta}>nível {progressPoints}/{maxPoints} · {pct}%</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: boss.color }]} />
          </View>
          {boss.description ? <Text style={styles.headerDesc}>{boss.description}</Text> : null}
        </View>

        <View style={styles.timeline}>
          {progressions.map((p, i) => (
            <ProgressionRow
              key={p.id}
              progression={p}
              color={boss.color}
              isLast={i === progressions.length - 1}
              onPress={() => setSheetProg(p)}
            />
          ))}
        </View>
      </ScrollView>

      <MasteryLevelSheet
        progression={sheetProg}
        color={boss.color}
        onSelect={onSelect}
        onClose={() => setSheetProg(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerName: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  headerMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  headerDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  timeline: { paddingLeft: spacing.xs },
});
