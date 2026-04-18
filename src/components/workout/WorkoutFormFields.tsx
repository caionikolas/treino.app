import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common';
import { ColorPicker } from './ColorPicker';
import { spacing } from '@/theme';

interface Props {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
}

export function WorkoutFormFields({ name, color, onNameChange, onColorChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <Input label="Nome" value={name} onChangeText={onNameChange} placeholder="Ex: Treino A - Peito" />
      <ColorPicker label="Cor" value={color} onChange={onColorChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
});
