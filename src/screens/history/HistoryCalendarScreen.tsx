import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SessionCard } from '@/components/history';
import { EmptyState } from '@/components/common';
import { useHistoryStore } from '@/store/useHistoryStore';
import { colors, spacing, typography } from '@/theme';

LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
};
LocaleConfig.defaultLocale = 'pt-br';

type Props = any;

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function toIsoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export function HistoryCalendarScreen({ navigation }: Props) {
  const today = new Date();
  const [currentYearMonth, setCurrentYearMonth] = useState(toYearMonth(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sessionsByMonth = useHistoryStore(s => s.sessionsByMonth);
  const datesByMonth = useHistoryStore(s => s.datesByMonth);
  const loadMonth = useHistoryStore(s => s.loadMonth);

  useEffect(() => {
    loadMonth(currentYearMonth);
  }, [currentYearMonth, loadMonth]);

  const markedDates = useMemo(() => {
    const dates = datesByMonth[currentYearMonth] ?? [];
    const marks: Record<string, any> = {};
    dates.forEach(d => {
      marks[d] = { marked: true, dotColor: colors.accent };
    });
    if (selectedDay) {
      marks[selectedDay] = { ...(marks[selectedDay] ?? {}), selected: true, selectedColor: colors.accent };
    }
    return marks;
  }, [datesByMonth, currentYearMonth, selectedDay]);

  const sessionsOfDay = useMemo(() => {
    if (!selectedDay) return [];
    const all = sessionsByMonth[currentYearMonth] ?? [];
    return all.filter(s => toIsoDay(s.session.startedAt) === selectedDay);
  }, [sessionsByMonth, currentYearMonth, selectedDay]);

  return (
    <SafeAreaView style={styles.container}>
      <Calendar
        current={currentYearMonth + '-01'}
        onMonthChange={(m: any) => setCurrentYearMonth(toYearMonth(new Date(m.year, m.month - 1, 1)))}
        onDayPress={(d: any) => setSelectedDay(d.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.textPrimary,
          todayTextColor: colors.accent,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: colors.textPrimary,
          monthTextColor: colors.textPrimary,
          arrowColor: colors.accent,
          textDisabledColor: colors.border,
        }}
      />

      <View style={styles.listSection}>
        {selectedDay == null ? (
          <Text style={styles.hint}>Selecione um dia para ver sessões</Text>
        ) : sessionsOfDay.length === 0 ? (
          <EmptyState icon="event-busy" title="Nenhum treino neste dia" />
        ) : (
          <FlatList
            data={sessionsOfDay}
            keyExtractor={item => item.session.id}
            renderItem={({ item }) => (
              <SessionCard
                item={item}
                onPress={() => navigation.navigate('SessionDetail', { id: item.session.id })}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listSection: { flex: 1, padding: spacing.md },
  hint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  listContent: { paddingBottom: spacing.xxl },
});
