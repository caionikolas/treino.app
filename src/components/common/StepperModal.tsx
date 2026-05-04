import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  description?: string;
  initial: number;
  min?: number;
  max?: number;
  step?: number;
  formatter?: (n: number) => string;
  onClose: () => void;
  onSave: (value: number) => void;
}

export function StepperModal({
  visible,
  title,
  description,
  initial,
  min = 0,
  max = Infinity,
  step = 1,
  formatter = (n) => String(n),
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  const dec = () => setValue(v => Math.max(min, v - step));
  const inc = () => setValue(v => Math.min(max, v + step));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}

        <View style={styles.row}>
          <Pressable onPress={dec} style={styles.btn}>
            <Text style={styles.btnText}>−</Text>
          </Pressable>
          <Text style={styles.value}>{formatter(value)}</Text>
          <Pressable onPress={inc} style={styles.btn}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            onSave(value);
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
  desc: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.textPrimary, fontSize: 28, lineHeight: 30 },
  value: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '700',
    minWidth: 140,
    textAlign: 'center',
  },
  save: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
