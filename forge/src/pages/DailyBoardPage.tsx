import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { getDailyTasks, type DailyTask } from '../lib/scheduler';
import { priorityColor } from '../lib/utils';
import ProgressBar from '../components/ProgressBar';
import SubGoalItem from '../components/SubGoalItem';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DailyBoardPage() {
  const goals = useStore((s) => s.goals);
  const toggleSubGoal = useStore((s) => s.toggleSubGoal);
  const [refreshKey, setRefreshKey] = useState(0);

  const tasks: DailyTask[] = useMemo(() => {
    return getDailyTasks(goals);
  }, [goals, refreshKey]);

  const completedCount = tasks.filter((t) => t.subGoal.completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Group tasks by goal
  const grouped = tasks.reduce<Record<string, DailyTask[]>>((acc, task) => {
    const key = task.goal.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const handleToggle = (goalId: string, subGoalId: string) => {
    toggleSubGoal(goalId, subGoalId);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: '2rem',
            letterSpacing: '0.06em',
            color: 'var(--text)',
            margin: '0 0 0.25rem',
          }}
        >
          {greeting()}, let's build something great.
        </h1>
        <p
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            margin: 0,
            letterSpacing: '0.08em',
          }}
        >
          {formatToday()}
        </p>
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
          }}
        >
          <p
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '1.4rem',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            No tasks for today.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: '"Syne", sans-serif' }}>
            Add some goals to get your daily plan.
          </p>
        </div>
      )}

      {totalCount > 0 && (
        <>
          {/* Progress summary */}
          <div
            style={{
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1.1rem',
                  letterSpacing: '0.06em',
                  color: 'var(--text)',
                }}
              >
                {completedCount} of {totalCount} tasks done today
              </span>
              <span
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '0.85rem',
                  color: 'var(--amber)',
                }}
              >
                {percentage}%
              </span>
            </div>
            <ProgressBar value={percentage} height={6} />
          </div>

          {/* All done banner */}
          {allDone && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(245, 166, 35, 0.1)',
                border: '1px solid var(--amber)',
                borderRadius: 4,
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
              className="fade-in"
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔥</div>
              <div
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '2rem',
                  letterSpacing: '0.06em',
                  color: 'var(--amber)',
                }}
              >
                YOU SHOWED UP. THAT'S EVERYTHING.
              </div>
              <p style={{ color: 'var(--muted)', fontFamily: '"Syne", sans-serif', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
                All tasks for today are done. Come back tomorrow.
              </p>
            </div>
          )}

          {/* Task list grouped by goal */}
          {Object.values(grouped).map((groupTasks) => {
            const goal = groupTasks[0].goal;
            const accentColor = priorityColor(goal.priority);

            return (
              <div key={goal.id} style={{ marginBottom: '1.5rem' }}>
                {/* Goal section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    paddingBottom: '0.4rem',
                    borderBottom: `2px solid ${accentColor}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Bebas Neue", cursive',
                      fontSize: '0.95rem',
                      letterSpacing: '0.06em',
                      color: accentColor,
                    }}
                  >
                    {goal.title}
                  </span>
                  <span
                    style={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: '0.65rem',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {goal.priority}
                  </span>
                </div>

                {/* Tasks for this goal */}
                {groupTasks.map((task) => (
                  <SubGoalItem
                    key={task.subGoal.id}
                    subGoal={task.subGoal}
                    onToggle={() => handleToggle(goal.id, task.subGoal.id)}
                    showDescription
                  />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
