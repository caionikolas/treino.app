import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import { ExerciseMedia } from '@/components/exercise';
import { Badge, EmptyState } from '@/components/common';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { labelForCategory } from '@/constants/categories';
import { ExerciseStackParamList } from '@/navigation/ExerciseStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<ExerciseStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route }: Props) {
  const { exerciseId } = route.params;
  const exercise = useExerciseStore(s => s.findById(exerciseId));
  const { width } = useWindowDimensions();
  const mediaSize = width - spacing.md * 2;

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <ExerciseMedia filename={exercise.mediaFilename} size={mediaSize} />
        </View>
        <Text style={styles.name}>{exercise.name}</Text>
        <View style={styles.badges}>
          <Badge label={labelForMuscleGroup(exercise.muscleGroup)} />
          <Badge label={labelForCategory(exercise.category)} color={colors.primaryLight} />
        </View>
        <Text style={styles.sectionTitle}>Como executar</Text>
        <Text style={styles.instructions}>{exercise.instructions}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  media: { width: '100%', marginBottom: spacing.lg },
  name: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  instructions: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
});
