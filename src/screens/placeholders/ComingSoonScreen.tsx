import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/common';
import { colors } from '@/theme';

interface Props {
  title?: string;
}

export function ComingSoonScreen({ title = 'Em breve' }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState icon="construction" title={title} subtitle="Esta funcionalidade está em desenvolvimento" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
