import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MasteryLevel, ProgressionView } from '@/types/boss';
import { MASTERY_LABELS, MASTERY_TARGETS } from '@/constants/mastery';
import { colors, spacing } from '@/theme';

interface Props {
  progression: ProgressionView | null;
  color: string;
  onSelect: (level: MasteryLevel) => void;
  onClose: () => void;
}

const LEVELS: Array<1 | 2 | 3> = [1, 2, 3];

export function MasteryLevelSheet({ progression, color, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={progression !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {progression ? (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>{progression.name}</Text>
              {LEVELS.map(lvl => {
                const selected = progression.masteryLevel >= lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => onSelect(lvl)}
                    style={({ pressed }) => [styles.levelRow, pressed && { opacity: 0.7 }]}
                  >
                    <Icon
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={selected ? color : colors.textSecondary}
                    />
                    <Text style={styles.levelLabel}>{MASTERY_LABELS[lvl]}</Text>
                    <Text style={styles.levelTarget}>
                      {MASTERY_TARGETS[progression.kind][lvl]}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => onSelect(0)}
                style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.resetText}>Ainda não comecei</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  levelLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  levelTarget: { color: colors.textSecondary, fontSize: 13 },
  resetRow: { paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  resetText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
