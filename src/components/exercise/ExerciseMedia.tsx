import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resolveMedia } from '@/database/mediaResolver';
import { colors, radius } from '@/theme';

interface Props {
  filename: string | null;
  paused?: boolean;
  style?: ViewStyle;
}

export function ExerciseMedia({ filename, paused = false, style }: Props) {
  const source = resolveMedia(filename);

  if (!source) {
    return (
      <View style={[styles.placeholder, style]}>
        <Icon name="fitness-center" size={48} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Video
        source={source as any}
        style={StyleSheet.absoluteFill}
        repeat
        muted
        paused={paused}
        resizeMode="cover"
        playInBackground={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  placeholder: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
