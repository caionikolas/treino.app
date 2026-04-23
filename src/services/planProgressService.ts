import { Plan, PlanStatus } from '@/types/plan';
import { planRepository } from '@/database/repositories/planRepository';
import { sessionRepository } from '@/database/repositories/sessionRepository';

export interface ProgressInputSession {
  workoutId: string;
  finishedAt: number;
}

export interface AdvancementResult {
  currentIndex: number;
  status: PlanStatus;
  lastAdvancedAt: number | null;
  completedAt: number | null;
}

/**
 * Pure function: given a plan, the ordered workoutIds of its sequence,
 * and candidate completed sessions sorted by finishedAt ascending,
 * compute the new progress state.
 */
export function computeAdvancement(
  plan: Plan,
  workoutIds: string[],
  sessions: ProgressInputSession[],
): AdvancementResult {
  if (plan.status !== 'active') {
    return {
      currentIndex: plan.currentIndex,
      status: plan.status,
      lastAdvancedAt: plan.lastAdvancedAt,
      completedAt: plan.completedAt,
    };
  }

  let index = plan.currentIndex;
  let lastAdvanced = plan.lastAdvancedAt ?? plan.startedAt ?? 0;
  let status: PlanStatus = 'active';
  let completedAt: number | null = null;

  const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);

  for (const s of sorted) {
    if (index >= workoutIds.length) break;
    if (s.finishedAt <= lastAdvanced) continue; // boundary also enforced by SQL in reconcilePlan
    if (s.workoutId !== workoutIds[index]) continue;

    index += 1;
    lastAdvanced = s.finishedAt;

    if (index >= workoutIds.length) {
      status = 'completed';
      completedAt = s.finishedAt;
      break;
    }
  }

  return { currentIndex: index, status, lastAdvancedAt: lastAdvanced, completedAt };
}

/**
 * Reads the plan + its workouts + relevant sessions, computes advancement,
 * and persists if anything changed.
 */
export async function reconcilePlan(planId: string): Promise<AdvancementResult | null> {
  const found = await planRepository.findById(planId);
  if (!found) return null; // null = not found
  const { plan, workouts } = found;
  if (plan.status !== 'active') {
    // return current state unchanged for non-active plans
    return {
      currentIndex: plan.currentIndex,
      status: plan.status,
      lastAdvancedAt: plan.lastAdvancedAt,
      completedAt: plan.completedAt,
    };
  }

  const workoutIds = workouts.map(w => w.workoutId);
  if (workoutIds.length === 0) return null;

  // SQL uses strict `finished_at > since`; computeAdvancement rechecks `<= lastAdvanced` as a safety guard.
  const since = plan.lastAdvancedAt ?? plan.startedAt ?? 0;
  const sessions = await sessionRepository.findCompletedForWorkoutsSince(workoutIds, since);

  const next = computeAdvancement(plan, workoutIds, sessions);
  const changed =
    next.currentIndex !== plan.currentIndex ||
    next.status !== plan.status ||
    next.lastAdvancedAt !== plan.lastAdvancedAt ||
    next.completedAt !== plan.completedAt;

  if (changed) {
    await planRepository.updateProgress(planId, next);
  }
  return next;
}

/** Reconcile every active plan that contains the given workoutId. */
export async function reconcileAllActivePlans(workoutId: string): Promise<void> {
  const plans = await planRepository.findActivePlansContainingWorkout(workoutId);
  for (const p of plans) {
    await reconcilePlan(p.id);
  }
}
