import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { runMigrations } from '@/database/migrations';
import { runSeeds } from '@/database/seeds/runSeeds';
import { useExerciseStore } from '@/store/useExerciseStore';
import { colors } from '@/theme';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadExercises = useExerciseStore(s => s.load);

  useEffect(() => {
    (async () => {
      try {
        await runMigrations();
        await runSeeds();
        await loadExercises();
        setReady(true);
      } catch (e) {
        console.error('Bootstrap failed', e);
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      }
    })();
  }, [loadExercises]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao iniciar o app:</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
});

export default App;
