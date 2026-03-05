import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Goal } from '../store/useStore';
import { priorityColor } from '../lib/utils';

function weightedPick(goals: Goal[]): Goal | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates: { goal: Goal; weight: number }[] = [];

  for (const goal of goals) {
    if (goal.archived) continue;

    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(1, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    candidates.push({ goal, weight: 1 / daysLeft });
  }

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const c of candidates) {
    rand -= c.weight;
    if (rand <= 0) return c.goal;
  }

  return candidates[candidates.length - 1].goal;
}

export default function BlindBoxPage() {
  const goals = useStore((s) => s.goals);

  const [revealed, setRevealed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);

  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const hasGoals = activeGoals.length > 0;

  const reveal = () => {
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      const picked = weightedPick(goals);
      setCurrentGoal(picked);
      setRevealed(true);
    }, 600);
  };

  const handleAnother = () => {
    setRevealed(false);
    setCurrentGoal(null);
    setTimeout(reveal, 100);
  };

  const handleRevealClick = () => {
    if (!revealed) reveal();
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
        Let fate decide what you focus on next.
      </p>

      {!hasGoals && (
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
            NO GOALS YET
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: '"Syne", sans-serif', margin: '0.5rem 0 0' }}>
            Add some goals first, then come back.
          </p>
        </div>
      )}

      {hasGoals && (
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
              REVEAL A GOAL
            </button>
          )}

          {/* Revealed goal */}
          {revealed && currentGoal && !shaking && (
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                backgroundColor: 'var(--bg2)',
                border: `1px solid ${priorityColor(currentGoal.priority)}`,
                borderLeft: `4px solid ${priorityColor(currentGoal.priority)}`,
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
                  color: priorityColor(currentGoal.priority),
                  letterSpacing: '0.1em',
                  margin: '0 0 0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                {currentGoal.priority} priority
              </p>

              <h2
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1.8rem',
                  letterSpacing: '0.04em',
                  color: 'var(--text)',
                  margin: '0 0 0.5rem',
                }}
              >
                {currentGoal.title}
              </h2>

              {currentGoal.description && (
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.85rem',
                    fontFamily: '"Syne", sans-serif',
                    margin: '0 0 1rem',
                    lineHeight: 1.5,
                  }}
                >
                  {currentGoal.description}
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
                This is your focus. Make it count.
              </p>

              <button
                className="btn-secondary"
                onClick={handleAnother}
              >
                GIVE ME ANOTHER →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
