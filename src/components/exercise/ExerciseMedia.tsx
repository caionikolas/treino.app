import React from 'react';
import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resolveMedia } from '@/database/mediaResolver';
import { colors, radius } from '@/theme';

interface Props {
  filename: string | null;
  size: number;
  paused?: boolean;
}

export function ExerciseMedia({ filename, size, paused = false }: Props) {
  const source = resolveMedia(filename);

  if (!source) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Icon name="fitness-center" size={Math.min(72, size * 0.3)} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Video
      source={source as any}
      style={{ width: size, height: size, backgroundColor: colors.primaryLight, borderRadius: radius.lg }}
      repeat
      muted
      paused={paused}
      resizeMode="cover"
      playInBackground={false}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
