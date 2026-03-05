import { useStore } from '../store/useStore';
import type { Goal, SubGoal, TimeEstimate, ScheduledBlock, DailyPlan } from '../store/useStore';
import { uuid, todayISO } from './utils';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_DAILY_HOURS = 7;
const DEFAULT_HOURS = 2;
const SPLIT_THRESHOLD = 2; // subgoals > this can be split across days

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

// ── Priority ordering ────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2 };

// ── FUNCTION 1: estimateSubGoalTime ─────────────────────────────────────────

export async function estimateSubGoalTime(
  subGoals: Array<{ id: string; title: string; description?: string }>,
  goal: Goal
): Promise<TimeEstimate[]> {
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_ANTHROPIC_API_KEY;

  const eligible = subGoals.filter((sg) => {
    // Only estimate subgoals that are active (for draft/store subgoals)
    const storeSg = goal.subGoals?.find((s) => s.id === sg.id);
    if (storeSg) return storeSg.includedInPlan && !storeSg.completed;
    return true; // draft subgoal — always estimate
  });

  if (eligible.length === 0) return [];

  const userPrompt =
    `Goal: ${goal.title}\n` +
    `Priority: ${goal.priority}\n` +
    `Deadline: ${goal.deadline}\n\n` +
    `Estimate hours for each of these subgoals:\n` +
    eligible
      .map((sg) => `- ID: ${sg.id} | Title: ${sg.title} | Description: ${sg.description ?? 'N/A'}`)
      .join('\n');

  if (!apiKey) {
    console.warn('[schedulerAgent] VITE_ANTHROPIC_API_KEY not set — using default estimates');
    return eligible.map((sg) => ({
      subGoalId: sg.id,
      estimatedHours: DEFAULT_HOURS,
      confidenceLevel: 'low',
      reasoning: 'No API key — using default estimate.',
    }));
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:
          'You are a realistic project time estimator. You estimate how many hours a motivated but non-expert person would need to complete a milestone, working in focused sessions.\n\n' +
          'Rules:\n' +
          '- Be realistic, not optimistic. Add 20% buffer to your raw estimate.\n' +
          '- Minimum estimate: 0.5 hours. Maximum: 8 hours per subgoal.\n' +
          '- If a subgoal is vague, estimate on the higher end.\n' +
          '- Return ONLY valid JSON. No markdown. No preamble.\n\n' +
          'JSON schema:\n' +
          '{\n' +
          '  "estimates": [\n' +
          '    {\n' +
          '      "subGoalId": string,\n' +
          '      "estimatedHours": number,\n' +
          '      "confidenceLevel": "low" | "medium" | "high",\n' +
          '      "reasoning": string\n' +
          '    }\n' +
          '  ]\n' +
          '}',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);

    const estimates: TimeEstimate[] = (parsed.estimates ?? []).map((e: {
      subGoalId: string;
      estimatedHours: number;
      confidenceLevel: 'low' | 'medium' | 'high';
      reasoning: string;
    }) => ({
      subGoalId: e.subGoalId,
      estimatedHours: Math.min(8, Math.max(0.5, Number(e.estimatedHours) || DEFAULT_HOURS)),
      confidenceLevel: e.confidenceLevel ?? 'medium',
      reasoning: e.reasoning ?? '',
    }));

    // Save to store
    useStore.getState().setTimeEstimates(estimates);
    console.log('[schedulerAgent] estimates saved:', estimates);
    return estimates;
  } catch (err) {
    console.error('[schedulerAgent] estimateSubGoalTime error:', err);
    const fallback: TimeEstimate[] = eligible.map((sg) => ({
      subGoalId: sg.id,
      estimatedHours: DEFAULT_HOURS,
      confidenceLevel: 'low',
      reasoning: 'Estimation failed — using default.',
    }));
    useStore.getState().setTimeEstimates(fallback);
    return fallback;
  }
}

// ── FUNCTION 2: buildSchedule ────────────────────────────────────────────────

export function buildSchedule(
  goals: Goal[],
  estimates: TimeEstimate[]
): Record<string, DailyPlan> {
  const today = todayISO();
  const estimateMap = new Map(estimates.map((e) => [e.subGoalId, e.estimatedHours]));

  // STEP 1 — Build work queue
  type WorkItem = {
    subGoalId: string;
    goalId: string;
    estimatedHours: number;
    priorityOrder: number;
    deadline: string;
    order: number;
    subGoalObj: SubGoal;
  };

  const queue: WorkItem[] = [];

  for (const goal of goals) {
    if (goal.archived) continue;
    const pOrder = PRIORITY_ORDER[goal.priority] ?? 2;
    for (const sg of goal.subGoals) {
      if (!sg.includedInPlan || sg.completed) continue;
      const hrs = estimateMap.get(sg.id) ?? DEFAULT_HOURS;
      queue.push({
        subGoalId: sg.id,
        goalId: goal.id,
        estimatedHours: hrs,
        priorityOrder: pOrder,
        deadline: goal.deadline,
        order: sg.order,
        subGoalObj: sg,
      });
    }
  }

  // Sort: priority, then deadline, then order
  queue.sort((a, b) => {
    if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    return a.order - b.order;
  });

  if (queue.length === 0) return {};

  // STEP 2 — Determine date range
  const activeGoals = goals.filter((g) => !g.archived && g.subGoals.some((sg) => sg.includedInPlan && !sg.completed));
  if (activeGoals.length === 0) return {};

  const furthestDeadline = activeGoals.reduce(
    (max, g) => (g.deadline > max ? g.deadline : max),
    today
  );
  // Extend slightly beyond furthest deadline to accommodate overruns
  const endDate = addDays(furthestDeadline, 14);
  const allDates = dateRange(today, endDate);

  // STEP 3 — Distribute hours across days
  const dayUsed = new Map<string, number>(); // date -> hours used
  for (const d of allDates) dayUsed.set(d, 0);

  const blocksByDate = new Map<string, ScheduledBlock[]>();
  for (const d of allDates) blocksByDate.set(d, []);

  const now = new Date().toISOString();

  for (const item of queue) {
    let remaining = item.estimatedHours;
    let dateIdx = 0;

    while (remaining > 0 && dateIdx < allDates.length) {
      const date = allDates[dateIdx];
      const used = dayUsed.get(date) ?? 0;
      const cap = MAX_DAILY_HOURS - used;

      if (cap <= 0) {
        dateIdx++;
        continue;
      }

      if (item.estimatedHours <= SPLIT_THRESHOLD) {
        // Must fit in one slot — needs full capacity for this item
        if (cap < remaining) {
          dateIdx++;
          continue;
        }
        // Fits
        const block: ScheduledBlock = {
          id: uuid(),
          subGoalId: item.subGoalId,
          goalId: item.goalId,
          date,
          allocatedHours: remaining,
          completedHours: 0,
          status: 'planned',
        };
        blocksByDate.get(date)!.push(block);
        dayUsed.set(date, used + remaining);
        remaining = 0;
      } else {
        // Can split — take as much as possible today
        const allocate = Math.min(remaining, cap);
        const block: ScheduledBlock = {
          id: uuid(),
          subGoalId: item.subGoalId,
          goalId: item.goalId,
          date,
          allocatedHours: allocate,
          completedHours: 0,
          status: 'planned',
        };
        blocksByDate.get(date)!.push(block);
        dayUsed.set(date, used + allocate);
        remaining -= allocate;
        dateIdx++;
      }
    }
  }

  // STEP 4 — Deadline pressure check
  const { setGoalWarning } = useStore.getState();

  for (const goal of goals) {
    if (goal.archived) continue;
    const goalSubGoals = goal.subGoals.filter((sg) => sg.includedInPlan && !sg.completed);
    if (goalSubGoals.length === 0) {
      setGoalWarning(goal.id, undefined);
      continue;
    }

    // Find latest scheduled date for this goal's blocks
    let latestDate = today;
    for (const [date, blocks] of blocksByDate) {
      if (blocks.some((b) => b.goalId === goal.id)) {
        if (date > latestDate) latestDate = date;
      }
    }

    if (latestDate > goal.deadline) {
      const daysLeft = dateRange(today, goal.deadline).length;
      const totalHours = goalSubGoals.reduce((s, sg) => s + (estimateMap.get(sg.id) ?? DEFAULT_HOURS), 0);
      if (totalHours > MAX_DAILY_HOURS * daysLeft) {
        setGoalWarning(goal.id, 'deadline_at_risk');
      } else {
        setGoalWarning(goal.id, 'deadline_at_risk');
      }
    } else {
      setGoalWarning(goal.id, undefined);
    }
  }

  // STEP 5 — Build DailyPlan map (only dates with blocks)
  const plans: Record<string, DailyPlan> = {};

  for (const [date, blocks] of blocksByDate) {
    if (blocks.length === 0) continue;
    const totalPlanned = blocks.reduce((s, b) => s + b.allocatedHours, 0);
    plans[date] = {
      date,
      blocks,
      totalPlannedHours: totalPlanned,
      totalCompletedHours: 0,
      generatedAt: now,
    };
  }

  return plans;
}

// ── FUNCTION 3: runEndOfDay ──────────────────────────────────────────────────

export async function runEndOfDay(date: string): Promise<{ rolledOverHours: number; replanNote: string }> {
  const store = useStore.getState();
  const todayPlan = store.dailyPlans[date];

  if (!todayPlan) return { rolledOverHours: 0, replanNote: '' };

  // Mark unfinished blocks as rolled-over and collect remainder
  const rolledOverItems: Array<{ block: ScheduledBlock; remainingHours: number }> = [];

  const updatedTodayBlocks = todayPlan.blocks.map((block) => {
    if (block.status === 'done') return block;
    const remainingHours = Math.max(0, block.allocatedHours - block.completedHours);
    if (remainingHours > 0) {
      rolledOverItems.push({ block, remainingHours });
    }
    return { ...block, status: 'rolled-over' as const };
  });

  const totalRolledHours = rolledOverItems.reduce((s, i) => s + i.remainingHours, 0);

  // Update today's plan
  store.updateDailyPlan(date, {
    ...todayPlan,
    blocks: updatedTodayBlocks,
  });

  // Optional replan note from Claude
  let replanNote = '';
  if (totalRolledHours > 0) {
    replanNote = await fetchReplanNote(totalRolledHours, rolledOverItems.length);
  }

  // Inject rolled-over blocks into tomorrow
  const tomorrow = addDays(date, 1);
  const existingTomorrow = useStore.getState().dailyPlans[tomorrow];
  const tomorrowBlocks = existingTomorrow?.blocks ?? [];

  const newRolledBlocks: ScheduledBlock[] = rolledOverItems.map(({ block, remainingHours }) => ({
    ...block,
    id: uuid(),
    date: tomorrow,
    allocatedHours: remainingHours,
    completedHours: 0,
    status: 'planned' as const,
    rolledOverFrom: date,
  }));

  // Prepend rolled-over blocks, then existing planned blocks
  const combined = [...newRolledBlocks, ...tomorrowBlocks];

  // Split into what fits tomorrow (≤7h) and overflow
  const finalTomorrow: ScheduledBlock[] = [];
  const overflow: ScheduledBlock[] = [];
  let runningHours = 0;

  for (const block of combined) {
    if (runningHours + block.allocatedHours <= MAX_DAILY_HOURS) {
      finalTomorrow.push(block);
      runningHours += block.allocatedHours;
    } else {
      const canFit = MAX_DAILY_HOURS - runningHours;
      if (canFit > 0.25) {
        finalTomorrow.push({ ...block, allocatedHours: canFit });
        overflow.push({
          ...block,
          id: uuid(),
          date: addDays(date, 2),
          allocatedHours: block.allocatedHours - canFit,
        });
      } else {
        overflow.push({ ...block, date: addDays(date, 2) });
      }
      runningHours = MAX_DAILY_HOURS;
    }
  }

  store.updateDailyPlan(tomorrow, {
    date: tomorrow,
    blocks: finalTomorrow,
    totalPlannedHours: finalTomorrow.reduce((s, b) => s + b.allocatedHours, 0),
    totalCompletedHours: finalTomorrow.reduce((s, b) => s + b.completedHours, 0),
    generatedAt: new Date().toISOString(),
    replanReason: totalRolledHours > 0 ? 'rollover' : undefined,
  });

  // Handle overflow
  if (overflow.length > 0) {
    const dayAfter = addDays(date, 2);
    const existing = useStore.getState().dailyPlans[dayAfter];
    const dayAfterBlocks = [...overflow, ...(existing?.blocks ?? [])];
    store.updateDailyPlan(dayAfter, {
      date: dayAfter,
      blocks: dayAfterBlocks,
      totalPlannedHours: dayAfterBlocks.reduce((s, b) => s + b.allocatedHours, 0),
      totalCompletedHours: dayAfterBlocks.reduce((s, b) => s + b.completedHours, 0),
      generatedAt: new Date().toISOString(),
      replanReason: 'rollover',
    });
  }

  store.setSchedulerLastRun(new Date().toISOString());

  return { rolledOverHours: totalRolledHours, replanNote };
}

async function fetchReplanNote(rolledHours: number, count: number): Promise<string> {
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        system: 'You write brief, motivating one-sentence notes about replanning work. Return only the sentence, no quotes.',
        messages: [
          {
            role: 'user',
            content: `${count} task(s) totalling ${rolledHours.toFixed(1)} hours rolled over to tomorrow. Write one sentence explaining the situation and encouraging the user.`,
          },
        ],
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

// ── FUNCTION 4: triggerFullReplan ────────────────────────────────────────────

export function triggerFullReplan(): void {
  const { goals, timeEstimates, dailyPlans, setDailyPlans, setSchedulerLastRun } = useStore.getState();
  const today = todayISO();

  // Preserve past days' plans
  const preserved: Record<string, DailyPlan> = {};
  for (const [date, plan] of Object.entries(dailyPlans)) {
    if (date < today) preserved[date] = plan;
  }

  const newPlans = buildSchedule(goals, timeEstimates);
  setDailyPlans({ ...preserved, ...newPlans });
  setSchedulerLastRun(new Date().toISOString());

  console.log('[schedulerAgent] full replan done, days scheduled:', Object.keys(newPlans).length);
}
