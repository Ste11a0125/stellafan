import { useState } from 'react';
import type { Goal } from '../store/useStore';
import { useStore } from '../store/useStore';
import { formatDeadline, priorityColor } from '../lib/utils';
import ProgressBar from './ProgressBar';
import SubGoalItem from './SubGoalItem';

type Props = {
  goal: Goal;
};

export default function GoalCard({ goal }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const toggleSubGoal = useStore((s) => s.toggleSubGoal);

  const includedSubGoals = goal.subGoals.filter((sg) => sg.includedInPlan);
  const completedCount = includedSubGoals.filter((sg) => sg.completed).length;
  const totalCount = includedSubGoals.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const accentColor = priorityColor(goal.priority);
  const preview = [...includedSubGoals].sort((a, b) => a.order - b.order).slice(0, 4);
  const hasMore = includedSubGoals.length > 4;

  const priorityLabels: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    normal: 'NORMAL',
  };

  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        style={{
          backgroundColor: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--amber)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, backgroundColor: accentColor }} />

        <div style={{ padding: '1rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontFamily: '"DM Mono", monospace',
                color: accentColor,
                letterSpacing: '0.1em',
                padding: '2px 6px',
                border: `1px solid ${accentColor}`,
                borderRadius: 2,
              }}
            >
              {priorityLabels[goal.priority]}
            </span>

            <span
              style={{
                fontSize: '0.72rem',
                fontFamily: '"DM Mono", monospace',
                color: 'var(--muted)',
              }}
            >
              {formatDeadline(goal.deadline)}
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '1.3rem',
              letterSpacing: '0.05em',
              color: 'var(--text)',
              margin: '0.5rem 0',
            }}
          >
            {goal.title}
          </h3>

          {/* Progress */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: '"DM Mono", monospace' }}>
                {isAllDone ? 'COMPLETE ✓' : `${completedCount} / ${totalCount} done`}
              </span>
              <span style={{ fontSize: '0.75rem', color: accentColor, fontFamily: '"DM Mono", monospace' }}>
                {percentage}%
              </span>
            </div>
            <ProgressBar value={percentage} color={accentColor} />
          </div>

          {/* Sub-goals preview */}
          <div onClick={(e) => e.stopPropagation()}>
            {preview.map((sg) => (
              <SubGoalItem
                key={sg.id}
                subGoal={sg}
                onToggle={() => toggleSubGoal(goal.id, sg.id)}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--amber)',
                fontSize: '0.8rem',
                fontFamily: '"Syne", sans-serif',
                cursor: 'pointer',
                padding: '0.5rem 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              View all {includedSubGoals.length} →
            </button>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              width: '100%',
              maxWidth: 560,
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
            className="fade-in"
          >
            <div style={{ height: 4, backgroundColor: accentColor }} />
            <div style={{ padding: '1.5rem' }}>
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontFamily: '"DM Mono", monospace',
                      color: accentColor,
                      letterSpacing: '0.1em',
                    }}
                  >
                    {priorityLabels[goal.priority]} · {formatDeadline(goal.deadline)}
                  </span>
                  <h2
                    style={{
                      fontFamily: '"Bebas Neue", cursive',
                      fontSize: '1.8rem',
                      letterSpacing: '0.05em',
                      color: 'var(--text)',
                      margin: '0.25rem 0 0',
                    }}
                  >
                    {goal.title}
                  </h2>
                  {goal.description && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                      {goal.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Progress summary */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: '"DM Mono", monospace' }}>
                    {completedCount} of {totalCount} milestones complete
                  </span>
                  <span style={{ fontSize: '0.75rem', color: accentColor, fontFamily: '"DM Mono", monospace' }}>
                    {percentage}%
                  </span>
                </div>
                <ProgressBar value={percentage} color={accentColor} height={6} />
              </div>

              {/* All sub-goals */}
              <div>
                {[...includedSubGoals]
                  .sort((a, b) => a.order - b.order)
                  .map((sg) => (
                    <SubGoalItem
                      key={sg.id}
                      subGoal={sg}
                      onToggle={() => toggleSubGoal(goal.id, sg.id)}
                      showDescription
                    />
                  ))}
              </div>

              {/* Goal complete banner */}
              {isAllDone && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(42, 255, 160, 0.1)',
                    border: '1px solid var(--green)',
                    borderRadius: 4,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                  <div
                    style={{
                      fontFamily: '"Bebas Neue", cursive',
                      fontSize: '1.4rem',
                      color: 'var(--green)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    GOAL COMPLETE
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                    You showed up. That's everything.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
