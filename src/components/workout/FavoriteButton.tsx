import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onToggle, size = 28 }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Icon
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? '#FFD700' : colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
  pressed: { opacity: 0.7 },
});
