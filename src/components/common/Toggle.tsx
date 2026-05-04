import React from 'react';
import { Switch, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}

export function Toggle({ value, onChange, color }: Props) {
  return (
    <View style={styles.wrap}>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? colors.textPrimary : colors.textSecondary}
        trackColor={{ false: colors.surface, true: color ?? colors.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { transform: [{ scale: 0.9 }] },
});
