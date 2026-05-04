import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingRow, StepperModal } from '@/components/common';
import { WorkoutNameField } from './WorkoutNameField';
import { ColorPickerModal } from './ColorPickerModal';
import { formatRestTime } from '@/utils/formatRestTime';
import { colors, spacing } from '@/theme';

interface Props {
  name: string;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onDefaultSetsChange: (n: number) => void;
  onDefaultRestChange: (seconds: number) => void;
}

export function WorkoutFormFields(props: Props) {
  const [colorOpen, setColorOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <WorkoutNameField
        label="Novo treino"
        value={props.name}
        onChangeText={props.onNameChange}
        placeholder="Nome do treino"
      />

      <SettingRow
        icon="palette"
        label="Cor"
        onPress={() => setColorOpen(true)}
        rightAccessory={<View style={[styles.swatch, { backgroundColor: props.color }]} />}
      />
      <SettingRow
        icon="repeat"
        label="Séries"
        value={`${props.defaultSets} séries`}
        onPress={() => setSetsOpen(true)}
      />
      <SettingRow
        icon="timer"
        label="Descanso"
        value={formatRestTime(props.defaultRestSeconds)}
        onPress={() => setRestOpen(true)}
      />

      <ColorPickerModal
        visible={colorOpen}
        current={props.color}
        onClose={() => setColorOpen(false)}
        onSave={props.onColorChange}
      />
      <StepperModal
        visible={setsOpen}
        title="Séries por exercício"
        description="Quantidade padrão de séries para novos exercícios deste treino."
        initial={props.defaultSets}
        min={1}
        max={10}
        onClose={() => setSetsOpen(false)}
        onSave={props.onDefaultSetsChange}
      />
      <StepperModal
        visible={restOpen}
        title="Tempo de descanso"
        description="Quanto descanso entre as séries (padrão para novos exercícios)."
        initial={props.defaultRestSeconds}
        min={0}
        max={600}
        step={15}
        formatter={formatRestTime}
        onClose={() => setRestOpen(false)}
        onSave={props.onDefaultRestChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingBottom: spacing.xs,
    marginBottom: spacing.lg,
  },
  swatch: { width: 24, height: 24, borderRadius: 12 },
});
