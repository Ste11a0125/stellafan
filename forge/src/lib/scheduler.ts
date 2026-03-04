import type { Goal, SubGoal } from '../store/useStore';
import { todayISO } from './utils';

export type DailyTask = {
  subGoal: SubGoal;
  goal: Goal;
};

const MAX_DAILY_TASKS = 8;
const CACHE_KEY_PREFIX = 'forge_daily_';

export function getDailyTasks(goals: Goal[]): DailyTask[] {
  const today = todayISO();
  const cacheKey = CACHE_KEY_PREFIX + today;

  // Check cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to recalculate
    }
  }

  const tasks = calculateDailyTasks(goals);

  // Cache result
  localStorage.setItem(cacheKey, JSON.stringify(tasks));

  return tasks;
}

export function calculateDailyTasks(goals: Goal[]): DailyTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeGoals = goals.filter(g => !g.archived);

  const priorityOrder = { critical: 0, high: 1, normal: 2 };

  // Sort goals by priority
  const sortedGoals = [...activeGoals].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const tasks: DailyTask[] = [];

  for (const goal of sortedGoals) {
    if (tasks.length >= MAX_DAILY_TASKS) break;

    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);

    const daysUntilDeadline = Math.max(
      1,
      Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    const remainingSubGoals = goal.subGoals.filter(
      sg => sg.includedInPlan && !sg.completed
    );

    if (remainingSubGoals.length === 0) continue;

    const dailyRate = remainingSubGoals.length / daysUntilDeadline;
    const countForToday = Math.min(
      Math.ceil(dailyRate),
      remainingSubGoals.length,
      MAX_DAILY_TASKS - tasks.length
    );

    const sortedSubGoals = [...remainingSubGoals].sort((a, b) => a.order - b.order);

    for (let i = 0; i < countForToday; i++) {
      tasks.push({ subGoal: sortedSubGoals[i], goal });
    }
  }

  return tasks;
}

export function invalidateDailyCache() {
  const today = todayISO();
  localStorage.removeItem(CACHE_KEY_PREFIX + today);
}
