import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MasteryLevel } from '@/types/boss';

interface Props {
  level: MasteryLevel;
  color: string;
}

export function MasteryPips({ level, color }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.pip,
            { borderColor: color },
            level >= i && { backgroundColor: color },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  pip: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
