import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { buildSchedule, runEndOfDay, triggerFullReplan } from '../lib/schedulerAgent';
import { priorityColor, todayISO } from '../lib/utils';
import ProgressBar from '../components/ProgressBar';
import type { ScheduledBlock, Goal } from '../store/useStore';

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

// ── Time logging input ────────────────────────────────────────────────────

function TimeLogger({
  block,
  onUpdate,
}: {
  block: ScheduledBlock;
  onUpdate: (hours: number) => void;
}) {
  const [val, setVal] = useState(block.completedHours.toString());

  const handleBlur = () => {
    const parsed = Math.min(block.allocatedHours, Math.max(0, parseFloat(val) || 0));
    setVal(parsed.toString());
    onUpdate(parsed);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <input
        type="number"
        value={val}
        min={0}
        max={block.allocatedHours}
        step={0.5}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        disabled={block.status === 'done' || block.status === 'rolled-over'}
        style={{
          width: 56,
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          color: 'var(--text)',
          fontFamily: '"DM Mono", monospace',
          fontSize: '0.8rem',
          padding: '3px 6px',
          outline: 'none',
          opacity: block.status === 'done' || block.status === 'rolled-over' ? 0.5 : 1,
        }}
      />
      <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: '"DM Mono", monospace' }}>
        / {block.allocatedHours} hrs
      </span>
    </div>
  );
}

// ── Block status badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduledBlock['status'] }) {
  const cfg: Record<ScheduledBlock['status'], { label: string; color: string }> = {
    planned: { label: 'PLANNED', color: 'var(--muted)' },
    done: { label: 'DONE ✓', color: 'var(--green)' },
    partial: { label: 'PARTIAL', color: 'var(--amber)' },
    'rolled-over': { label: 'ROLLED OVER', color: 'var(--ember)' },
  };
  const { label, color } = cfg[status];
  return (
    <span style={{ fontSize: '0.62rem', fontFamily: '"DM Mono", monospace', color, letterSpacing: '0.08em' }}>
      {label}
    </span>
  );
}

// ── Block row ────────────────────────────────────────────────────────────

function BlockRow({
  block,
  subGoalTitle,
  date,
}: {
  block: ScheduledBlock;
  subGoalTitle: string;
  date: string;
}) {
  const updateScheduledBlock = useStore((s) => s.updateScheduledBlock);

  const handleHoursUpdate = (hours: number) => {
    let status: ScheduledBlock['status'] = 'planned';
    if (hours >= block.allocatedHours) status = 'done';
    else if (hours > 0) status = 'partial';
    updateScheduledBlock(date, block.id, { completedHours: hours, status });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 0.9rem',
        backgroundColor: block.status === 'done' ? 'rgba(42,255,160,0.04)' : 'var(--bg2)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${block.status === 'done' ? 'var(--green)' : block.status === 'rolled-over' ? 'var(--ember)' : 'var(--amber)'}`,
        marginBottom: '0.4rem',
        opacity: block.status === 'rolled-over' ? 0.6 : 1,
      }}
    >
      {/* Title & status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: '0.88rem',
          color: block.status === 'done' ? 'var(--muted)' : 'var(--text)',
          textDecoration: block.status === 'done' ? 'line-through' : 'none',
          marginBottom: '0.15rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {subGoalTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: '"DM Mono", monospace' }}>
            ~ {block.allocatedHours} hrs
            {block.rolledOverFrom && ` · rolled from ${block.rolledOverFrom}`}
          </span>
          <StatusBadge status={block.status} />
        </div>
      </div>

      {/* Time logger */}
      <TimeLogger block={block} onUpdate={handleHoursUpdate} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function DailyBoardPage() {
  const goals = useStore((s) => s.goals);
  const timeEstimates = useStore((s) => s.timeEstimates);
  const dailyPlans = useStore((s) => s.dailyPlans);
  const setDailyPlans = useStore((s) => s.setDailyPlans);

  const today = todayISO();
  const todayPlan = dailyPlans[today];

  const [endingDay, setEndingDay] = useState(false);
  const [rolloverMsg, setRolloverMsg] = useState<string | null>(null);

  // On mount, build schedule if today has no plan
  useEffect(() => {
    if (!todayPlan) {
      const plans = buildSchedule(goals, timeEstimates);
      if (Object.keys(plans).length > 0) {
        const preserved: typeof dailyPlans = {};
        for (const [date, plan] of Object.entries(dailyPlans)) {
          if (date < today) preserved[date] = plan;
        }
        setDailyPlans({ ...preserved, ...plans });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Replan if goals change and there's still no plan for today
  useEffect(() => {
    if (!todayPlan && goals.length > 0) {
      triggerFullReplan();
    }
  }, [goals, todayPlan]);

  const blocks = todayPlan?.blocks ?? [];

  // Map subGoalId → title
  const subGoalTitles = new Map<string, string>();
  const subGoalGoalId = new Map<string, string>();
  for (const goal of goals) {
    for (const sg of goal.subGoals) {
      subGoalTitles.set(sg.id, sg.title);
      subGoalGoalId.set(sg.id, goal.id);
    }
  }

  // Group visible blocks by goal
  const visibleBlocks = blocks.filter((b) => b.status !== 'rolled-over' || b.rolledOverFrom === undefined);
  const grouped = new Map<string, { goal: Goal; blocks: ScheduledBlock[] }>();
  for (const block of blocks) {
    const goalId = block.goalId;
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) continue;
    if (!grouped.has(goalId)) grouped.set(goalId, { goal, blocks: [] });
    grouped.get(goalId)!.blocks.push(block);
  }

  // Summary stats
  const totalPlanned = todayPlan?.totalPlannedHours ?? 0;
  const totalCompleted = blocks.reduce((s, b) => s + b.completedHours, 0);
  const totalRemaining = Math.max(0, totalPlanned - totalCompleted);
  const progressPct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const allDone = blocks.length > 0 && blocks.every((b) => b.status === 'done');

  const hasBlocks = blocks.length > 0;

  // Suppress unused variable warning
  void visibleBlocks;

  // ── End My Day ──────────────────────────────────────────────────────────

  const handleEndDay = async () => {
    const confirmed = window.confirm('End your day? Unfinished tasks will roll over to tomorrow.');
    if (!confirmed) return;

    setEndingDay(true);
    try {
      const { rolledOverHours, replanNote } = await runEndOfDay(today);
      const msg =
        rolledOverHours > 0
          ? `${rolledOverHours.toFixed(1)} hrs rolled over to tomorrow. Tomorrow's plan has been updated.${replanNote ? ' ' + replanNote : ''}`
          : 'Great day! No tasks to roll over.';
      setRolloverMsg(msg);
    } finally {
      setEndingDay(false);
    }
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

      {/* Rollover notification */}
      {rolloverMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(245,166,35,0.1)',
            border: '1px solid var(--amber)',
            borderRadius: 4,
            marginBottom: '1.5rem',
          }}
          className="fade-in"
        >
          <p style={{ color: 'var(--amber)', fontFamily: '"Syne", sans-serif', fontSize: '0.9rem', margin: 0 }}>
            {rolloverMsg}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasBlocks && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p
            style={{
              fontFamily: '"Bebas Neue", cursive',
              fontSize: '1.4rem',
              color: 'var(--muted)',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            No tasks scheduled for today.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: '"Syne", sans-serif' }}>
            Add some goals to get your daily plan.
          </p>
        </div>
      )}

      {hasBlocks && (
        <>
          {/* ── Daily summary bar ── */}
          <div
            style={{
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1rem',
                  letterSpacing: '0.06em',
                  color: 'var(--text)',
                }}
              >
                Today: {totalPlanned.toFixed(1)} hrs planned · {totalCompleted.toFixed(1)} hrs completed · {totalRemaining.toFixed(1)} hrs remaining
              </span>
              <span
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '0.85rem',
                  color: 'var(--amber)',
                }}
              >
                {progressPct}%
              </span>
            </div>
            <ProgressBar value={progressPct} height={6} />
          </div>

          {/* ── All done banner ── */}
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

          {/* ── Goal sections ── */}
          {[...grouped.values()].map(({ goal, blocks: goalBlocks }) => {
            const accentColor = priorityColor(goal.priority);

            return (
              <div key={goal.id} style={{ marginBottom: '1.75rem' }}>
                {/* Deadline-at-risk warning */}
                {goal.scheduleWarning === 'deadline_at_risk' && (
                  <div
                    style={{
                      padding: '0.6rem 0.9rem',
                      backgroundColor: 'rgba(245,166,35,0.08)',
                      border: '1px solid var(--amber)',
                      borderRadius: 3,
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>⚠</span>
                    <span style={{ color: 'var(--amber)', fontFamily: '"Syne", sans-serif', fontSize: '0.8rem' }}>
                      At current pace, this goal may miss its deadline. Consider reducing scope or extending deadline.
                    </span>
                  </div>
                )}

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

                {/* Blocks for this goal */}
                {goalBlocks.map((block) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    subGoalTitle={subGoalTitles.get(block.subGoalId) ?? block.subGoalId}
                    date={today}
                  />
                ))}
              </div>
            );
          })}

          {/* ── End My Day button ── */}
          {!rolloverMsg && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={handleEndDay}
                disabled={endingDay}
                style={{
                  padding: '0.7rem 1.5rem',
                  fontFamily: '"Bebas Neue", cursive',
                  letterSpacing: '0.06em',
                  fontSize: '1rem',
                  opacity: endingDay ? 0.7 : 1,
                }}
              >
                {endingDay ? 'Wrapping up your day...' : 'End My Day →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
