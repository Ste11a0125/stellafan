import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorageValue } from 'zustand/middleware';
import { uuid, todayISO } from '../lib/utils';
import { invalidateDailyCache } from '../lib/scheduler';

// Custom storage: writes to a file via the Vite dev server API, falls back to localStorage.
const fileStorage = {
  async getItem(name: string): Promise<StorageValue<unknown> | null> {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('no api');
      const text = await res.text();
      if (!text || text === 'null') return null;
      const data = JSON.parse(text);
      return data?.[name] ?? null;
    } catch {
      const raw = localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    }
  },
  async setItem(name: string, value: StorageValue<unknown>): Promise<void> {
    const payload: Record<string, unknown> = {};
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const text = await res.text();
        if (text && text !== 'null') Object.assign(payload, JSON.parse(text));
      }
    } catch { /* ignore */ }
    payload[name] = value;
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      localStorage.setItem(name, JSON.stringify(value));
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const text = await res.text();
        const payload = text && text !== 'null' ? JSON.parse(text) : {};
        delete payload[name];
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      localStorage.removeItem(name);
    }
  },
};

export type Priority = 'critical' | 'high' | 'normal';
export type GoalColor = 'ember' | 'amber' | 'green' | 'blue';

export type SubGoal = {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  includedInPlan: boolean;
};

export type Goal = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  deadline: string;
  createdAt: string;
  subGoals: SubGoal[];
  color: GoalColor;
  archived: boolean;
  scheduleWarning?: 'deadline_at_risk';
};

// ── Scheduler types ──────────────────────────────────────────────────────────

export type TimeEstimate = {
  subGoalId: string;
  estimatedHours: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  reasoning: string;
};

export type ScheduledBlock = {
  id: string;
  subGoalId: string;
  goalId: string;
  date: string;                  // YYYY-MM-DD
  allocatedHours: number;
  completedHours: number;        // default 0
  status: 'planned' | 'done' | 'partial' | 'rolled-over';
  rolledOverFrom?: string;
};

export type DailyPlan = {
  date: string;                  // YYYY-MM-DD, primary key
  blocks: ScheduledBlock[];
  totalPlannedHours: number;
  totalCompletedHours: number;
  generatedAt: string;           // ISO timestamp
  replanReason?: string;
};

// ── App state ────────────────────────────────────────────────────────────────

type AppState = {
  goals: Goal[];
  lastDailyBoardDate: string;
  timeEstimates: TimeEstimate[];
  dailyPlans: Record<string, DailyPlan>;
  schedulerLastRun: string | null;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'subGoals' | 'archived'> & { subGoals: Omit<SubGoal, 'id' | 'goalId'>[] }) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  archiveGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  toggleSubGoal: (goalId: string, subGoalId: string) => void;
  reorderSubGoals: (goalId: string, subGoals: SubGoal[]) => void;
  addSubGoal: (goalId: string, subGoal: Omit<SubGoal, 'id' | 'goalId'>) => void;
  updateSubGoal: (goalId: string, subGoalId: string, updates: Partial<Pick<SubGoal, 'title' | 'description'>>) => void;
  deleteSubGoal: (goalId: string, subGoalId: string) => void;
  updateSubGoalIncluded: (goalId: string, subGoalId: string, included: boolean) => void;

  // Scheduler actions
  setTimeEstimates: (estimates: TimeEstimate[]) => void;
  setDailyPlans: (plans: Record<string, DailyPlan>) => void;
  updateDailyPlan: (date: string, plan: DailyPlan) => void;
  updateScheduledBlock: (date: string, blockId: string, updates: Partial<ScheduledBlock>) => void;
  setSchedulerLastRun: (ts: string) => void;
  setGoalWarning: (goalId: string, warning: 'deadline_at_risk' | undefined) => void;
};

const priorityToColor: Record<Priority, GoalColor> = {
  critical: 'ember',
  high: 'amber',
  normal: 'green',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      goals: [],
      lastDailyBoardDate: todayISO(),
      timeEstimates: [],
      dailyPlans: {},
      schedulerLastRun: null,

      addGoal: (goalData) => {
        const id = uuid();
        const subGoals: SubGoal[] = goalData.subGoals.map((sg, idx) => ({
          ...sg,
          id: uuid(),
          goalId: id,
          order: sg.order ?? idx,
        }));

        const color = priorityToColor[goalData.priority];

        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...goalData,
              id,
              color,
              createdAt: new Date().toISOString(),
              subGoals,
              archived: false,
            },
          ],
        }));

        invalidateDailyCache();
        return id;
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
        invalidateDailyCache();
      },

      archiveGoal: (id) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, archived: true } : g
          ),
        }));
        invalidateDailyCache();
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }));
        invalidateDailyCache();
      },

      toggleSubGoal: (goalId, subGoalId) => {
        set((state) => {
          const newGoals = state.goals.map((g) => {
            if (g.id !== goalId) return g;
            return {
              ...g,
              subGoals: g.subGoals.map((sg) => {
                if (sg.id !== subGoalId) return sg;
                const completed = !sg.completed;
                return {
                  ...sg,
                  completed,
                  completedAt: completed ? new Date().toISOString() : undefined,
                };
              }),
            };
          });

          // When marking a subgoal complete, mark its scheduled block as done
          const subGoal = newGoals.find(g => g.id === goalId)?.subGoals.find(sg => sg.id === subGoalId);
          if (subGoal?.completed) {
            const today = todayISO();
            const plan = state.dailyPlans[today];
            if (plan) {
              const updatedBlocks = plan.blocks.map(b =>
                b.subGoalId === subGoalId && b.status !== 'done'
                  ? { ...b, status: 'done' as const, completedHours: b.allocatedHours }
                  : b
              );
              const totalCompleted = updatedBlocks.reduce((s, b) => s + b.completedHours, 0);
              return {
                goals: newGoals,
                dailyPlans: {
                  ...state.dailyPlans,
                  [today]: { ...plan, blocks: updatedBlocks, totalCompletedHours: totalCompleted },
                },
              };
            }
          }

          return { goals: newGoals };
        });
        invalidateDailyCache();
      },

      reorderSubGoals: (goalId, subGoals) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, subGoals } : g
          ),
        }));
      },

      addSubGoal: (goalId, subGoal) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            const newSg: SubGoal = {
              ...subGoal,
              id: uuid(),
              goalId,
            };
            return { ...g, subGoals: [...g.subGoals, newSg] };
          }),
        }));
      },

      updateSubGoal: (goalId, subGoalId, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            return {
              ...g,
              subGoals: g.subGoals.map((sg) =>
                sg.id === subGoalId ? { ...sg, ...updates } : sg
              ),
            };
          }),
        }));
      },

      deleteSubGoal: (goalId, subGoalId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            return { ...g, subGoals: g.subGoals.filter((sg) => sg.id !== subGoalId) };
          }),
        }));
        invalidateDailyCache();
      },

      updateSubGoalIncluded: (goalId, subGoalId, included) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            return {
              ...g,
              subGoals: g.subGoals.map((sg) =>
                sg.id === subGoalId ? { ...sg, includedInPlan: included } : sg
              ),
            };
          }),
        }));
      },

      // ── Scheduler actions ──────────────────────────────────────────────

      setTimeEstimates: (incoming) => {
        set((state) => {
          const existing = state.timeEstimates.filter(
            (e) => !incoming.find((i) => i.subGoalId === e.subGoalId)
          );
          return { timeEstimates: [...existing, ...incoming] };
        });
      },

      setDailyPlans: (plans) => {
        set({ dailyPlans: plans });
      },

      updateDailyPlan: (date, plan) => {
        set((state) => ({
          dailyPlans: { ...state.dailyPlans, [date]: plan },
        }));
      },

      updateScheduledBlock: (date, blockId, updates) => {
        set((state) => {
          const plan = state.dailyPlans[date];
          if (!plan) return {};
          const updatedBlocks = plan.blocks.map((b) =>
            b.id === blockId ? { ...b, ...updates } : b
          );
          const totalCompleted = updatedBlocks.reduce((s, b) => s + b.completedHours, 0);
          return {
            dailyPlans: {
              ...state.dailyPlans,
              [date]: { ...plan, blocks: updatedBlocks, totalCompletedHours: totalCompleted },
            },
          };
        });
      },

      setSchedulerLastRun: (ts) => {
        set({ schedulerLastRun: ts });
      },

      setGoalWarning: (goalId, warning) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, scheduleWarning: warning } : g
          ),
        }));
      },

    }),
    {
      name: 'forge-app-state',
      storage: fileStorage,
    }
  )
);
