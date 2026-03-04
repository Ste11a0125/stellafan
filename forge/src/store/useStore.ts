import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uuid, todayISO } from '../lib/utils';
import { invalidateDailyCache } from '../lib/scheduler';

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
};

type AppState = {
  goals: Goal[];
  lastDailyBoardDate: string;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'subGoals' | 'archived'> & { subGoals: Omit<SubGoal, 'id' | 'goalId'>[] }) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  archiveGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  toggleSubGoal: (goalId: string, subGoalId: string) => void;
  reorderSubGoals: (goalId: string, subGoals: SubGoal[]) => void;
  addSubGoal: (goalId: string, subGoal: Omit<SubGoal, 'id' | 'goalId'>) => void;
  updateSubGoalIncluded: (goalId: string, subGoalId: string, included: boolean) => void;
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
        set((state) => ({
          goals: state.goals.map((g) => {
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
          }),
        }));
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
    }),
    {
      name: 'forge-app-state',
    }
  )
);
