import React, { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { WorkoutSummary } from '@/types/workout';
import { FavoriteButton } from './FavoriteButton';

interface Props {
  workout: WorkoutSummary;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

const DELETE_PANEL_WIDTH = 88;

export function WorkoutCard({ workout, onPress, onLongPress, onToggleFavorite, onDelete }: Props) {
  const swipeableRef = useRef<Swipeable | null>(null);

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete();
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-DELETE_PANEL_WIDTH, 0],
      outputRange: [0, DELETE_PANEL_WIDTH],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.deletePanelWrap}>
        <Animated.View style={[styles.deletePanel, { transform: [{ translateX }] }]}>
          <RectButton style={styles.deleteBtn} onPress={handleDelete}>
            <Icon name="delete-outline" size={26} color="#FFFFFF" />
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  const exerciseLabel = workout.exerciseCount === 1
    ? '1 exercício'
    : `${workout.exerciseCount} exercícios`;

  return (
    <View style={styles.wrap}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={400}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={[styles.iconCircle, { backgroundColor: workout.color }]}>
            <Icon name="fitness-center" size={22} color="#FFFFFF" />
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Treino</Text>
            <Text style={styles.name} numberOfLines={1}>{workout.name}</Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.metaText} numberOfLines={1}>{exerciseLabel}</Text>
            <View style={styles.arrowRow}>
              <FavoriteButton isFavorite={workout.isFavorite} onToggle={onToggleFavorite} size={18} />
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    borderRadius: 36,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#1F1F36',
    paddingVertical: 14,
    paddingLeft: 10,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 36,
    minHeight: 76,
  },
  cardPressed: { opacity: 0.9 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  label: {
    color: '#FFFFFF',
    opacity: 0.55,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  right: { alignItems: 'flex-end', gap: 4 },
  metaText: {
    color: '#FFFFFF',
    opacity: 0.65,
    fontSize: 12,
    fontWeight: '600',
  },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deletePanelWrap: {
    width: DELETE_PANEL_WIDTH,
  },
  deletePanel: {
    flex: 1,
    backgroundColor: '#E94560',
  },
  deleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
