import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { WORKOUT_COLORS } from '@/constants/workoutColors';
import { colors, spacing, typography } from '@/theme';

interface Props {
  visible: boolean;
  current: string;
  onClose: () => void;
  onSave: (color: string) => void;
}

export function ColorPickerModal({ visible, current, onClose, onSave }: Props) {
  const [selected, setSelected] = useState(current);

  useEffect(() => {
    if (visible) setSelected(current);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Cor</Text>
        <Text style={styles.desc}>Escolha uma cor para este treino.</Text>

        <View style={styles.grid}>
          {WORKOUT_COLORS.map(c => {
            const isSel = selected === c;
            return (
              <Pressable key={c} onPress={() => setSelected(c)} style={styles.cell}>
                <View style={[styles.swatch, { backgroundColor: c }, isSel && styles.swatchSel]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            onSave(selected);
            onClose();
          }}
          style={styles.save}
        >
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa' },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  desc: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cell: { width: '16%', alignItems: 'center', paddingVertical: spacing.xs },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSel: { borderWidth: 2, borderColor: colors.textPrimary },
  save: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
