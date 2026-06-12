import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onToggle, size = 22 }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Icon
        name={isFavorite ? 'bookmark' : 'bookmark-border'}
        size={size}
        color={isFavorite ? colors.warning : colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
