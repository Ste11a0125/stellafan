import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import GoalCard from '../components/GoalCard';
import type { Priority } from '../store/useStore';

type FilterTab = 'all' | Priority | 'completed';

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const [filter, setFilter] = useState<FilterTab>('all');
  const navigate = useNavigate();

  const activeGoals = goals.filter((g) => !g.archived);

  const filteredGoals = activeGoals.filter((g) => {
    if (filter === 'all') return true;
    if (filter === 'completed') {
      const included = g.subGoals.filter((sg) => sg.includedInPlan);
      return included.length > 0 && included.every((sg) => sg.completed);
    }
    return g.priority === filter;
  });

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'critical', label: 'CRITICAL' },
    { id: 'high', label: 'HIGH' },
    { id: 'normal', label: 'NORMAL' },
    { id: 'completed', label: 'COMPLETED' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1
          style={{
            fontFamily: '"Bebas Neue", cursive',
            fontSize: '2.5rem',
            letterSpacing: '0.08em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          YOUR GOALS
        </h1>

        <button
          className="btn-primary"
          onClick={() => navigate('/goals/new')}
        >
          + NEW GOAL
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: filter === tab.id ? '2px solid var(--amber)' : '2px solid transparent',
              color: filter === tab.id ? 'var(--amber)' : 'var(--muted)',
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '0.9rem',
              letterSpacing: '0.08em',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredGoals.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
          }}
        >
          {activeGoals.length === 0 ? (
            <>
              <p
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1.5rem',
                  letterSpacing: '0.05em',
                  color: 'var(--muted)',
                  marginBottom: '1.5rem',
                }}
              >
                Your first goal is one step away.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate('/goals/new')}
                style={{ fontSize: '1.2rem', padding: '0.75rem 2rem' }}
              >
                + CREATE YOUR FIRST GOAL
              </button>
            </>
          ) : (
            <p
              style={{
                fontFamily: '"Bebas Neue", cursive',
                fontSize: '1.2rem',
                color: 'var(--muted)',
                letterSpacing: '0.05em',
              }}
            >
              No goals match this filter.
            </p>
          )}
        </div>
      )}

      {/* Goals grid */}
      {filteredGoals.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
