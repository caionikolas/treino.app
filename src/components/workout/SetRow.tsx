import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  setLabel: string | 'warmup';
  reps: number;
  onChangeReps: (n: number) => void;
  onRemove?: () => void;
}

export function SetRow({ setLabel, reps, onChangeReps, onRemove }: Props) {
  const isWarmup = setLabel === 'warmup';
  return (
    <View style={styles.row}>
      <View style={styles.colSet}>
        {isWarmup ? (
          <MaterialIcons name="bolt" size={20} color={colors.accent} />
        ) : (
          <Text style={styles.cellText}>{setLabel}</Text>
        )}
      </View>
      <View style={styles.colReps}>
        <TextInput
          value={String(reps)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            onChangeReps(Number.isFinite(n) ? n : 0);
          }}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.colWeight}>
        <Text style={styles.placeholder}>—</Text>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
          <MaterialIcons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={styles.removeBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff10',
  },
  colSet: { width: 40, alignItems: 'center' },
  colReps: { flex: 1, paddingHorizontal: spacing.sm },
  colWeight: { flex: 1, paddingHorizontal: spacing.sm, alignItems: 'flex-start' },
  cellText: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  input: {
    backgroundColor: colors.primaryLight,
    color: colors.textPrimary,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    minWidth: 60,
  },
  placeholder: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.sm },
  removeBtn: { width: 28, alignItems: 'center', justifyContent: 'center' },
});
