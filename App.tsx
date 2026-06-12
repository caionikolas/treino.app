import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { runMigrations } from '@/database/migrations';
import { runSeeds } from '@/database/seeds/runSeeds';
import { useExerciseStore } from '@/store/useExerciseStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { setupNotificationChannel } from '@/services/notificationService';
import { colors } from '@/theme';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadExercises = useExerciseStore(s => s.load);
  const initPlayerListeners = usePlayerStore(s => s.initListeners);

  useEffect(() => {
    (async () => {
      try {
        await runMigrations();
        await runSeeds();
        await loadExercises();
        await setupNotificationChannel();
        initPlayerListeners();
        setReady(true);
      } catch (e) {
        console.error('Bootstrap failed', e);
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      }
    })();
  }, [loadExercises, initPlayerListeners]);

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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
});

export default App;
