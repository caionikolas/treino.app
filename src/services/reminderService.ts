import notifee, { AndroidImportance, RepeatFrequency, TriggerType, TimestampTrigger, AuthorizationStatus } from '@notifee/react-native';
import { Plan, PlanWorkout } from '@/types/plan';
import { planRepository } from '@/database/repositories/planRepository';
import { isRestDay } from '@/utils/planSchedule';
import { getDb } from '@/database/connection';

const PLAN_CHANNEL_ID = 'plan-reminders';

export async function setupPlanReminderChannel(): Promise<void> {
  await notifee.createChannel({
    id: PLAN_CHANNEL_ID,
    name: 'Lembretes de plano',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });
}

export async function requestRemindersPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

function notificationIdForPlan(planId: string): string {
  return `plan-reminder-${planId}`;
}

/** Returns the next epoch ms for the given HH:MM after `from`. */
function nextOccurrence(hhmm: string, from: Date = new Date()): number {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setHours(h, m);
  if (d.getTime() <= from.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

async function buildBodyForPlan(plan: Plan, workouts: PlanWorkout[]): Promise<string | null> {
  if (plan.status !== 'active') return null;
  const today = new Date();
  if (isRestDay(plan.frequency, today)) return null;
  const next = workouts[plan.currentIndex];
  if (!next) return null;
  const db = getDb();
  const result = await db.execute('SELECT name FROM workouts WHERE id = ? LIMIT 1', [next.workoutId]);
  const row = result.rows?.[0] as { name: string } | undefined;
  return row ? `Hoje: ${row.name}` : null;
}

export async function scheduleReminderForPlan(plan: Plan): Promise<void> {
  if (!plan.reminderEnabled || !plan.reminderTime) {
    await cancelReminderForPlan(plan.id);
    return;
  }
  if (plan.status !== 'active') {
    await cancelReminderForPlan(plan.id);
    return;
  }
  const found = await planRepository.findById(plan.id);
  const workouts = found?.workouts ?? [];
  const body = await buildBodyForPlan(plan, workouts);
  const finalBody = body ?? `Lembrete do plano ${plan.name}`;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextOccurrence(plan.reminderTime),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: notificationIdForPlan(plan.id),
      title: plan.name,
      body: finalBody,
      android: {
        channelId: PLAN_CHANNEL_ID,
        pressAction: { id: 'open-plan', launchActivity: 'default' },
        autoCancel: true,
      },
      data: { type: 'plan-reminder', planId: plan.id } as Record<string, string>,
    },
    trigger,
  );
}

export async function cancelReminderForPlan(planId: string): Promise<void> {
  await notifee.cancelTriggerNotification(notificationIdForPlan(planId));
}

export async function syncAllReminders(): Promise<void> {
  const summaries = await planRepository.findAllSummaries();
  for (const s of summaries) {
    if (s.status !== 'active' || !s.reminderEnabled) {
      await cancelReminderForPlan(s.id);
    }
  }
  const active = await planRepository.findAllActive();
  for (const p of active) {
    await scheduleReminderForPlan(p);
  }
}
