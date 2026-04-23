import React, { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usePlanStore } from '@/store/usePlanStore';
import { PlanCard } from '@/components/plan/PlanCard';
import { PlanStackParamList } from '@/navigation/PlanStack';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<PlanStackParamList, 'PlanList'>;

export function PlanListScreen({ navigation }: Props) {
  const summaries = usePlanStore(s => s.summaries);
  const load = usePlanStore(s => s.load);
  const reconcileAll = usePlanStore(s => s.reconcileAll);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      reconcileAll();
    }, [reconcileAll]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum plano ainda. Toque no + para criar.</Text>
        }
        renderItem={({ item }) => (
          <PlanCard
            summary={item}
            onPress={() => navigation.navigate('PlanDetail', { id: item.id })}
          />
        )}
      />
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('PlanForm', { mode: 'new' })}
      >
        <Icon name="add" size={28} color={colors.textPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 64 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
