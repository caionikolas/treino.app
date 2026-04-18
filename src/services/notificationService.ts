import notifee, { AndroidImportance } from '@notifee/react-native';

const REST_CHANNEL_ID = 'rest-timer';

export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: REST_CHANNEL_ID,
    name: 'Fim do descanso',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
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
