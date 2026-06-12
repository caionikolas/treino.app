import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@/components/common';
import { WorkoutNameField } from '@/components/workout';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors, spacing } from '@/theme';

export function SettingsScreen() {
  const navigation = useNavigation();
  const storedName = useSettingsStore(s => s.username);
  const loadSettings = useSettingsStore(s => s.load);
  const setUsername = useSettingsStore(s => s.setUsername);
  const [name, setName] = useState(storedName);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setName(storedName);
  }, [storedName]);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome inválido', 'Digite um nome para salvar.');
      return;
    }
    await setUsername(trimmed);
    navigation.goBack();
  };

  const canSave = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <WorkoutNameField
            label="Perfil"
            value={name}
            onChangeText={setName}
            placeholder="Como devemos te chamar?"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Salvar"
          onPress={canSave ? onSave : () => {}}
          disabled={!canSave}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  fieldGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingBottom: spacing.xs,
    marginBottom: spacing.lg,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff10',
  },
  cta: { borderRadius: 999, backgroundColor: colors.accent },
});
