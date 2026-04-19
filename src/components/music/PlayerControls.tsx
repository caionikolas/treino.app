import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usePlayerStore } from '@/store/usePlayerStore';
import { colors, spacing } from '@/theme';

export function PlayerControls() {
  const playing = usePlayerStore(s => s.playing);
  const shuffle = usePlayerStore(s => s.shuffle);
  const repeat = usePlayerStore(s => s.repeat);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const skipNext = usePlayerStore(s => s.skipNext);
  const skipPrevious = usePlayerStore(s => s.skipPrevious);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);

  const repeatIcon = repeat === 'one' ? 'repeat-one' : 'repeat';

  return (
    <View style={styles.container}>
      <Pressable hitSlop={8} onPress={toggleShuffle} style={styles.side}>
        <Icon name="shuffle" size={24} color={shuffle ? colors.accent : colors.textSecondary} />
      </Pressable>
      <Pressable hitSlop={8} onPress={skipPrevious} style={styles.mid}>
        <Icon name="skip-previous" size={40} color={colors.textPrimary} />
      </Pressable>
      <Pressable hitSlop={8} onPress={togglePlayPause} style={styles.playBtn}>
        <Icon name={playing ? 'pause' : 'play-arrow'} size={40} color={colors.textPrimary} />
      </Pressable>
      <Pressable hitSlop={8} onPress={skipNext} style={styles.mid}>
        <Icon name="skip-next" size={40} color={colors.textPrimary} />
      </Pressable>
      <Pressable hitSlop={8} onPress={toggleRepeat} style={styles.side}>
        <Icon
          name={repeatIcon}
          size={24}
          color={repeat !== 'off' ? colors.accent : colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  side: { padding: spacing.sm },
  mid: { padding: spacing.sm },
  playBtn: {
    backgroundColor: colors.accent,
    borderRadius: 40,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
