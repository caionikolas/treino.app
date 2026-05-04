import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  icon?: string;
  label: string;
  value?: ReactNode;
  onPress?: () => void;
  rightAccessory?: ReactNode;
}

export function SettingRow({ icon, label, value, onPress, rightAccessory }: Props) {
  const content = (
    <>
      <View style={styles.left}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={20}
            color={colors.textSecondary}
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value !== undefined && value !== null ? (
          typeof value === 'string' || typeof value === 'number' ? (
            <Text style={styles.value}>{value}</Text>
          ) : (
            value
          )
        ) : null}
        {rightAccessory ??
          (onPress ? (
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          ) : null)}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.row} android_ripple={{ color: '#ffffff10' }}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff15',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: spacing.sm },
  label: { ...typography.body, color: colors.textPrimary },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  value: { ...typography.body, color: colors.textSecondary, marginRight: spacing.xs },
});
