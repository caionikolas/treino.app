import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input, Button } from '@/components/common';
import { spacing } from '@/theme';

interface Props {
  weight: string;
  reps: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function SetLogRow({ weight, reps, onWeightChange, onRepsChange, onConfirm, disabled }: Props) {
  return (
    <View>
      <View style={styles.inputs}>
        <View style={styles.field}>
          <Input
            label="Carga extra (kg)"
            value={weight}
            onChangeText={onWeightChange}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <View style={styles.field}>
          <Input
            label="Reps"
            value={reps}
            onChangeText={onRepsChange}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
      </View>
      <Button
        label="✅ Concluir série"
        onPress={onConfirm}
        disabled={disabled}
        style={styles.confirmBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputs: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  confirmBtn: { marginTop: spacing.sm, minHeight: 56 },
});
