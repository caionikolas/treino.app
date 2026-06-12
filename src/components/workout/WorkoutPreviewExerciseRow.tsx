import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { colors, spacing } from '@/theme';

interface Props {
  name: string;
  info: string;
  thumbnail?: string | null;
  isActive?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onDragStart?: () => void;
}

const DELETE_PANEL_WIDTH = 88;

export function WorkoutPreviewExerciseRow({
  name,
  info,
  isActive,
  onPress,
  onDelete,
  onDragStart,
}: Props) {
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
        <Animated.View
          style={[styles.deletePanel, { transform: [{ translateX }] }]}
        >
          <RectButton style={styles.deleteBtn} onPress={handleDelete}>
            <Icon name="delete-outline" size={26} color="#FFFFFF" />
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  const content = (
    <View style={styles.row}>
      <Pressable
        onLongPress={onDragStart}
        disabled={!onDragStart}
        delayLongPress={150}
        style={styles.handle}
        hitSlop={8}
      >
        <DragDots />
      </Pressable>

      <View style={styles.thumb}>
        <Image
          source={require('../../../assets/examples/weight1.png')}
          style={styles.thumbImage}
          resizeMode="contain"
        />
      </View>

      <Pressable onPress={onPress} style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.info} numberOfLines={1}>{info}</Text>
      </Pressable>
    </View>
  );

  if (isActive) {
    return <View style={styles.wrap}>{content}</View>;
  }

  return (
    <View style={styles.wrap}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        friction={2}
      >
        {content}
      </Swipeable>
    </View>
  );
}

function DragDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(r => (
        <View key={r} style={styles.dotRow}>
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff14',
  },
  handle: {
    width: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { gap: 3 },
  dotRow: { flexDirection: 'row', gap: 3 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textSecondary,
    opacity: 0.7,
  },
  thumb: {
    width: 64,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  thumbImage: {
    width: 48,
    height: 48,
  },
  body: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  info: { color: colors.textSecondary, fontSize: 13 },
});
