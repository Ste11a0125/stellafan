import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { SubGoal, Goal } from '../store/useStore';

type PickedTask = {
  subGoal: SubGoal;
  goal: Goal;
};

function weightedPick(goals: Goal[]): PickedTask | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates: { task: PickedTask; weight: number }[] = [];

  for (const goal of goals) {
    if (goal.archived) continue;

    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(1, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    const incomplete = goal.subGoals.filter((sg) => sg.includedInPlan && !sg.completed);
    for (const sg of incomplete) {
      candidates.push({ task: { subGoal: sg, goal }, weight: 1 / daysLeft });
    }
  }

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const c of candidates) {
    rand -= c.weight;
    if (rand <= 0) return c.task;
  }

  return candidates[candidates.length - 1].task;
}

export default function BlindBoxPage() {
  const goals = useStore((s) => s.goals);
  const toggleSubGoal = useStore((s) => s.toggleSubGoal);

  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [currentTask, setCurrentTask] = useState<PickedTask | null>(null);
  const [markedDone, setMarkedDone] = useState(false);

  const hasIncomplete = useMemo(() => {
    return goals.some((g) =>
      !g.archived && g.subGoals.some((sg) => sg.includedInPlan && !sg.completed)
    );
  }, [goals]);

  const reveal = () => {
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      const task = weightedPick(goals);
      setCurrentTask(task);
      setRevealed(true);
      setMarkedDone(false);
    }, 600);
  };

  const handleMarkDone = () => {
    if (!currentTask) return;
    toggleSubGoal(currentTask.goal.id, currentTask.subGoal.id);
    setMarkedDone(true);
  };

  const handleAnother = () => {
    setRevealed(false);
    setCurrentTask(null);
    setMarkedDone(false);
    setTimeout(reveal, 100);
  };

  const handleRevealClick = () => {
    if (!revealed) {
      reveal();
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: '"Bebas Neue", cursive',
          fontSize: '2.5rem',
          letterSpacing: '0.1em',
          color: 'var(--text)',
          margin: '0 0 0.25rem',
        }}
      >
        BLIND BOX
      </h1>
      <p
        style={{
          color: 'var(--muted)',
          fontFamily: '"Syne", sans-serif',
          fontSize: '0.9rem',
          marginBottom: '3rem',
        }}
      >
        Let fate decide what you work on next.
      </p>

      {!hasIncomplete && (
        <div
          style={{
            padding: '1.5rem 2rem',
            backgroundColor: 'rgba(42,255,160,0.08)',
            border: '1px solid var(--green)',
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
          <p
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '1.3rem',
              color: 'var(--green)',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            ALL TASKS COMPLETE
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: '"Syne", sans-serif', margin: '0.5rem 0 0' }}>
            Nothing left to pick. You're crushing it.
          </p>
        </div>
      )}

      {hasIncomplete && (
        <>
          {/* Mystery box */}
          <div
            onClick={handleRevealClick}
            style={{
              width: 160,
              height: 160,
              backgroundColor: 'var(--bg2)',
              border: `2px solid ${revealed ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              cursor: revealed ? 'default' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '1.5rem',
              animation: shaking ? 'shake 0.6s ease' : 'none',
              boxShadow: revealed ? '0 0 24px rgba(245,166,35,0.2)' : 'none',
            }}
          >
            {shaking ? '📦' : revealed ? '🎁' : '📦'}
          </div>

          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0) rotate(0); }
              20% { transform: translateX(-10px) rotate(-5deg); }
              40% { transform: translateX(10px) rotate(5deg); }
              60% { transform: translateX(-8px) rotate(-3deg); }
              80% { transform: translateX(8px) rotate(3deg); }
            }
          `}</style>

          {/* Not yet revealed */}
          {!revealed && !shaking && (
            <button
              className="btn-primary"
              onClick={reveal}
              style={{ fontSize: '1.2rem', padding: '0.75rem 2.5rem' }}
            >
              REVEAL A TASK
            </button>
          )}

          {/* Revealed task */}
          {revealed && currentTask && !shaking && (
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--amber)',
                borderLeft: '4px solid var(--amber)',
                borderRadius: 4,
                padding: '1.5rem',
                textAlign: 'left',
              }}
              className="fade-in"
            >
              <p
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '0.7rem',
                  color: 'var(--amber)',
                  letterSpacing: '0.1em',
                  margin: '0 0 0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                {currentTask.goal.title}
              </p>

              <h2
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1.5rem',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  margin: '0 0 0.5rem',
                }}
              >
                {currentTask.subGoal.title}
              </h2>

              {currentTask.subGoal.description && (
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.85rem',
                    fontFamily: '"Syne", sans-serif',
                    margin: '0 0 1rem',
                    lineHeight: 1.5,
                  }}
                >
                  {currentTask.subGoal.description}
                </p>
              )}

              <p
                style={{
                  color: 'var(--amber)',
                  fontSize: '0.85rem',
                  fontFamily: '"Syne", sans-serif',
                  fontStyle: 'italic',
                  margin: '0 0 1.25rem',
                }}
              >
                Ready? This one's yours.
              </p>

              {markedDone ? (
                <div style={{ color: 'var(--green)', fontFamily: '"Bebas Neue", cursive', fontSize: '1.1rem', letterSpacing: '0.06em' }}>
                  ✓ MARKED DONE — NICE WORK!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    onClick={handleMarkDone}
                  >
                    MARK DONE ✓
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleAnother}
                  >
                    GIVE ME ANOTHER →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* After marking done: another */}
          {revealed && markedDone && (
            <button
              className="btn-secondary"
              onClick={handleAnother}
              style={{ marginTop: '1rem' }}
            >
              GIVE ME ANOTHER →
            </button>
          )}
        </>
      )}
    </div>
  );
}
