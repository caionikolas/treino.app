import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SessionWithMeta } from '@/types/history';

interface Props {
  item: SessionWithMeta;
  onPress: () => void;
}

function formatHhMm(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const mm = Math.floor(seconds / 60);
  return mm > 0 ? `${mm} min` : `${seconds}s`;
}

export function SessionCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.workoutColor }]}>
        <Icon name="fitness-center" size={16} color="#FFFFFF" />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Sessão</Text>
        <Text style={styles.name} numberOfLines={1}>{item.workoutName}</Text>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {formatHhMm(item.session.startedAt)} • {formatDuration(item.session.durationSeconds)}
      </Text>
      <Icon name="arrow-forward" size={16} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F36',
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    gap: 10,
    marginBottom: 8,
  },
  pressed: { opacity: 0.9 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: {
    color: '#FFFFFF',
    opacity: 0.55,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  meta: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 6,
  },
});
