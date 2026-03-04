import { useState, useRef } from 'react';
import type { SubGoal } from '../store/useStore';
import CompletionBurst from './CompletionBurst';

type Props = {
  subGoal: SubGoal;
  onToggle: () => void;
  showDescription?: boolean;
};

type Burst = { x: number; y: number; id: number };

export default function SubGoalItem({ subGoal, onToggle, showDescription = false }: Props) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const checkRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!subGoal.completed) {
      const rect = checkRef.current?.getBoundingClientRect();
      if (rect) {
        const burst: Burst = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          id: Date.now(),
        };
        setBursts((prev) => [...prev, burst]);
      }
    }
    onToggle();
  };

  const removeBurst = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.6rem 0',
          borderBottom: '1px solid var(--border)',
          opacity: subGoal.completed ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <button
          ref={checkRef}
          onClick={handleToggle}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: `2px solid ${subGoal.completed ? 'var(--green)' : 'var(--border)'}`,
            backgroundColor: subGoal.completed ? 'var(--green)' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
        >
          {subGoal.completed && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="check-anim"
            >
              <path
                d="M2 6l3 3 5-5"
                stroke="#0a0a08"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontFamily: '"Syne", sans-serif',
              textDecoration: subGoal.completed ? 'line-through' : 'none',
              display: 'block',
            }}
          >
            {subGoal.title}
          </span>
          {showDescription && subGoal.description && (
            <span
              style={{
                color: 'var(--muted)',
                fontSize: '0.8rem',
                fontFamily: '"Syne", sans-serif',
                display: 'block',
                marginTop: '0.25rem',
                lineHeight: 1.4,
              }}
            >
              {subGoal.description}
            </span>
          )}
        </div>
      </div>

      {bursts.map((burst) => (
        <CompletionBurst
          key={burst.id}
          x={burst.x}
          y={burst.y}
          onDone={() => removeBurst(burst.id)}
        />
      ))}
    </>
  );
}
