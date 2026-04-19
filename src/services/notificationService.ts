import notifee, { AndroidImportance } from '@notifee/react-native';

const REST_CHANNEL_ID = 'rest-timer';
const WORKOUT_CHANNEL_ID = 'workout-ongoing';
const WORKOUT_NOTIFICATION_ID = 'workout-ongoing';

export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: REST_CHANNEL_ID,
    name: 'Fim do descanso',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: WORKOUT_CHANNEL_ID,
    name: 'Treino em andamento',
    importance: AndroidImportance.LOW,
    sound: undefined,
    vibration: false,
  });
}

export async function requestNotificationPermission(): Promise<void> {
  await notifee.requestPermission();
}

export async function showRestFinishedNotification(
  exerciseName: string,
  setNumber: number,
): Promise<void> {
  await notifee.displayNotification({
    title: 'Descanso acabou',
    body: `${exerciseName} — Série ${setNumber}`,
    android: {
      channelId: REST_CHANNEL_ID,
      pressAction: { id: 'default' },
      autoCancel: true,
    },
  });
}

function formatMmSs(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export async function showWorkoutOngoing(params: {
  exerciseName: string;
  elapsedSec: number;
}): Promise<void> {
  await notifee.displayNotification({
    id: WORKOUT_NOTIFICATION_ID,
    title: 'Treino em andamento',
    body: `${params.exerciseName} • ${formatMmSs(params.elapsedSec)}`,
    android: {
      channelId: WORKOUT_CHANNEL_ID,
      ongoing: true,
      pressAction: { id: 'default' },
      onlyAlertOnce: true,
      smallIcon: 'ic_launcher',
    },
  });
}

export async function cancelWorkoutOngoing(): Promise<void> {
  await notifee.cancelNotification(WORKOUT_NOTIFICATION_ID);
}
