import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resolveMedia } from '@/database/mediaResolver';
import { colors, radius } from '@/theme';

interface Props {
  filename: string | null;
  size: number;
}

export function ExerciseMedia({ filename, size }: Props) {
  const hasMedia = resolveMedia(filename) !== null;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Icon
        name={hasMedia ? 'play-circle-outline' : 'fitness-center'}
        size={Math.min(72, size * 0.3)}
        color={colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
