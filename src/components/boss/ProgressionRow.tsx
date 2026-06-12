import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProgressionView } from '@/types/boss';
import { MASTERY_LABELS } from '@/constants/mastery';
import { MasteryPips } from './MasteryPips';
import { colors } from '@/theme';

interface Props {
  progression: ProgressionView;
  color: string;
  isLast: boolean;
  onPress: () => void;
}

export function ProgressionRow({ progression, color, isLast, onPress }: Props) {
  const { locked, masteryLevel, name } = progression;
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      disabled={locked}
      style={({ pressed }) => [styles.row, pressed && !locked && { opacity: 0.85 }]}
    >
      <View style={styles.gutter}>
        {locked ? (
          <View style={styles.lockCircle}>
            <Icon name="lock" size={14} color={colors.textSecondary} />
          </View>
        ) : (
          <MasteryPips level={masteryLevel} color={color} />
        )}
        {!isLast ? (
          <View
            style={[styles.connector, { backgroundColor: locked ? colors.border : color }]}
          />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, locked && styles.lockedText]} numberOfLines={1}>
          {isLast ? `${name} · o chefão` : name}
        </Text>
        <Text style={[styles.sub, locked && styles.lockedText]}>
          {locked ? 'bloqueado' : MASTERY_LABELS[masteryLevel]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 64 },
  gutter: { width: 40, alignItems: 'center' },
  lockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  body: { flex: 1, paddingBottom: 20, paddingLeft: 4 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  lockedText: { opacity: 0.5 },
});
