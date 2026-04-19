import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import { colors, spacing, typography, radius } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (playlistId: string | null) => void;
}

export function SelectPlaylistModal({ visible, onClose, onSelect }: Props) {
  const summaries = usePlaylistStore(s => s.summaries);
  const load = usePlaylistStore(s => s.load);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Escolher playlist</Text>

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => onSelect(null)}
          >
            <Icon name="volume-off" size={24} color={colors.textSecondary} />
            <Text style={styles.rowText}>Sem música</Text>
          </Pressable>

          <View style={styles.divider} />

          <FlatList
            data={summaries}
            keyExtractor={p => p.id}
            ListEmptyComponent={
              <Text style={styles.empty}>
                Nenhuma playlist criada. Crie uma na tab Música.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onSelect(item.id)}
              >
                <Icon name="queue-music" size={24} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.name}</Text>
                  <Text style={styles.rowSub}>
                    {item.trackCount} música{item.trackCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '70%',
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
  },
  pressed: { backgroundColor: colors.primaryLight },
  rowText: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
});
