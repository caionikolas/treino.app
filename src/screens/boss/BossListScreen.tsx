import React, { useCallback } from 'react';
import { FlatList, StyleSheet, SafeAreaView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBossStore } from '@/store/useBossStore';
import { BossCard } from '@/components/boss/BossCard';
import { BossStackParamList } from '@/navigation/BossStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<BossStackParamList, 'BossList'>;

export function BossListScreen({ navigation }: Props) {
  const views = useBossStore(s => s.views);
  const load = useBossStore(s => s.load);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Sua jornada</Text>
        <Text style={styles.title}>Chefões</Text>
      </View>
      <FlatList
        data={views}
        keyExtractor={item => item.boss.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum chefão disponível.</Text>}
        renderItem={({ item }) => (
          <BossCard
            view={item}
            onPress={() => navigation.navigate('BossDetail', { id: item.boss.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: 2 },
  eyebrow: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  title: { ...typography.heading, color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 64 },
});
