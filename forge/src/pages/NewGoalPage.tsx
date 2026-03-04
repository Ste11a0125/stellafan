import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import { decomposeGoal, type AISubGoal } from '../lib/claude.ts';
import type { Priority } from '../store/useStore';

// ── Types ──────────────────────────────────────────────────────────────────

type FormData = {
  title: string;
  description: string;
  deadline: string;
  priority: Priority;
};

type SubGoalDraft = AISubGoal & {
  id: string;
  included: boolean;
};

// ── Sortable sub-goal card ─────────────────────────────────────────────────

function SortableSubGoalCard({
  sg,
  onToggle,
}: {
  sg: SubGoalDraft;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sg.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: sg.included ? 'var(--bg3)' : 'var(--bg2)',
        border: `1px solid ${sg.included ? 'var(--border)' : 'var(--bg3)'}`,
        borderLeft: sg.included ? '3px solid var(--amber)' : '3px solid transparent',
        marginBottom: '0.5rem',
        cursor: 'default',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          color: 'var(--muted)',
          cursor: 'grab',
          padding: '2px 4px',
          userSelect: 'none',
          flexShrink: 0,
          fontSize: '1.1rem',
        }}
      >
        ⠿
      </div>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `2px solid ${sg.included ? 'var(--amber)' : 'var(--border)'}`,
          backgroundColor: sg.included ? 'var(--amber)' : 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {sg.included && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0a0a08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: sg.included ? 'var(--text)' : 'var(--muted)', fontSize: '0.9rem', fontFamily: '"Syne", sans-serif', fontWeight: 500 }}>
          {sg.title}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: '"Syne", sans-serif', marginTop: '0.2rem', lineHeight: 1.4 }}>
          {sg.description}
        </div>
      </div>
    </div>
  );
}

// ── Loading messages ───────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Mapping your goal…',
  'Breaking it into wins…',
  'Calculating your path…',
];

// ── Main component ─────────────────────────────────────────────────────────

export default function NewGoalPage() {
  const navigate = useNavigate();
  const addGoal = useStore((s) => s.addGoal);

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form state
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    deadline: '',
    priority: 'normal',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Step 2 state
  const [subGoals, setSubGoals] = useState<SubGoalDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Goal title is required.';
    if (!form.deadline) errs.deadline = 'Please set a deadline.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── AI call ─────────────────────────────────────────────────────────────

  const callAI = useCallback(async () => {
    setLoading(true);
    setAiError(null);
    setLoadingMsgIdx(0);

    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1200);

    try {
      const result = await decomposeGoal({
        title: form.title,
        description: form.description,
        deadline: form.deadline,
        priority: form.priority,
      });

      setSubGoals(
        result.map((sg, idx) => ({
          ...sg,
          id: `sg-${idx}-${Date.now()}`,
          included: true,
        }))
      );
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'MISSING_API_KEY'
          ? 'No API key found. Add VITE_ANTHROPIC_API_KEY to your .env.local file.'
          : 'Failed to generate sub-goals. Please try again.';
      setAiError(msg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [form]);

  // ── Step transitions ────────────────────────────────────────────────────

  const handleStep1Submit = () => {
    if (!validate()) return;
    setStep(2);
    callAI();
  };

  const handleBack = () => {
    setStep(1);
    setSubGoals([]);
    setAiError(null);
  };

  // ── DnD handler ─────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubGoals((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  };

  const toggleSubGoal = (id: string) => {
    setSubGoals((prev) =>
      prev.map((sg) => (sg.id === id ? { ...sg, included: !sg.included } : sg))
    );
  };

  // ── Add custom sub-goal ─────────────────────────────────────────────────

  const addCustomSubGoal = () => {
    if (!customInput.trim()) return;
    setSubGoals((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: customInput.trim(),
        description: '',
        included: true,
      },
    ]);
    setCustomInput('');
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const mapped = subGoals.map((sg, idx) => ({
      title: sg.title,
      description: sg.description,
      completed: false,
      order: idx,
      includedInPlan: sg.included,
    }));

    addGoal({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      deadline: form.deadline,
      color: 'amber',
      subGoals: mapped,
    });

    navigate('/goals');
  };

  // ── Priority toggle colors ──────────────────────────────────────────────

  const priorityMeta: Record<Priority, { label: string; color: string }> = {
    critical: { label: 'CRITICAL', color: '#ff5c1a' },
    high: { label: 'HIGH', color: '#f5a623' },
    normal: { label: 'NORMAL', color: '#2affa0' },
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Page title */}
      <h1
        style={{
          fontFamily: '"Bebas Neue", cursive',
          fontSize: '2.2rem',
          letterSpacing: '0.08em',
          color: 'var(--text)',
          margin: '0 0 0.25rem',
        }}
      >
        NEW GOAL
      </h1>

      {/* Step indicator */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        {[1, 2].map((s) => (
          <div
            key={s}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: step >= s ? 'var(--amber)' : 'var(--bg3)',
              border: `2px solid ${step >= s ? 'var(--amber)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"DM Mono", monospace',
              fontSize: '0.75rem',
              color: step >= s ? '#0a0a08' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}
          >
            {s}
          </div>
        ))}
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: '"Syne", sans-serif' }}>
          {step === 1 ? 'Goal Setup' : 'AI Decomposition'}
        </span>
      </div>

      {/* ── STEP 1 ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="fade-in">
          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Goal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Launch my SaaS product"
              style={inputStyle(!!errors.title)}
            />
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does success look like?"
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Deadline *</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              style={inputStyle(!!errors.deadline)}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.deadline && <p style={errorStyle}>{errors.deadline}</p>}
          </div>

          {/* Priority toggle */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Priority *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(Object.keys(priorityMeta) as Priority[]).map((p) => {
                const meta = priorityMeta[p];
                const active = form.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, priority: p })}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      fontFamily: '"Bebas Neue", cursive',
                      fontSize: '1rem',
                      letterSpacing: '0.06em',
                      border: `2px solid ${active ? meta.color : 'var(--border)'}`,
                      backgroundColor: active ? `${meta.color}22` : 'transparent',
                      color: active ? meta.color : 'var(--muted)',
                      cursor: 'pointer',
                      borderRadius: 2,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button className="btn-primary" onClick={handleStep1Submit} style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem' }}>
            GENERATE SUB-GOALS →
          </button>
        </div>
      )}

      {/* ── STEP 2 ───────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="fade-in">
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div
                className="spinner"
                style={{
                  width: 48,
                  height: 48,
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--amber)',
                  borderRadius: '50%',
                  margin: '0 auto 1.5rem',
                }}
              />
              <p
                style={{
                  fontFamily: '"Bebas Neue", cursive',
                  fontSize: '1.2rem',
                  letterSpacing: '0.06em',
                  color: 'var(--amber)',
                }}
              >
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && aiError && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(255,92,26,0.1)',
                border: '1px solid var(--ember)',
                borderRadius: 4,
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--ember)', fontFamily: '"Syne", sans-serif', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
                {aiError}
              </p>
              <button className="btn-secondary" onClick={callAI} style={{ fontSize: '0.9rem' }}>
                TRY AGAIN
              </button>
            </div>
          )}

          {/* Sub-goals list */}
          {!loading && !aiError && subGoals.length > 0 && (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: '"Syne", sans-serif', marginBottom: '1rem' }}>
                Select the milestones you want to include in your plan. Drag to reorder.
              </p>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={subGoals.map((sg) => sg.id)} strategy={verticalListSortingStrategy}>
                  {subGoals.map((sg) => (
                    <SortableSubGoalCard key={sg.id} sg={sg} onToggle={() => toggleSubGoal(sg.id)} />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add custom sub-goal */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomSubGoal(); }}
                  placeholder="Add a custom milestone…"
                  style={{ ...inputStyle(false), flex: 1, margin: 0 }}
                />
                <button className="btn-secondary" onClick={addCustomSubGoal} style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                  + ADD
                </button>
              </div>
            </>
          )}

          {/* Action buttons */}
          {!loading && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={handleBack}>
                ← BACK
              </button>
              {!aiError && subGoals.length > 0 && (
                <button className="btn-secondary" onClick={callAI}>
                  REGENERATE ↺
                </button>
              )}
              {!aiError && subGoals.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  style={{ marginLeft: 'auto' }}
                >
                  SAVE GOAL →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: '"DM Mono", monospace',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  color: 'var(--muted)',
  marginBottom: '0.4rem',
  textTransform: 'uppercase' as const,
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  backgroundColor: 'var(--bg2)',
  border: `1px solid ${hasError ? 'var(--ember)' : 'var(--border)'}`,
  borderRadius: 2,
  color: 'var(--text)',
  fontFamily: '"Syne", sans-serif',
  fontSize: '0.9rem',
  padding: '0.6rem 0.75rem',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  display: 'block',
  boxSizing: 'border-box',
});

const errorStyle: React.CSSProperties = {
  color: 'var(--ember)',
  fontSize: '0.78rem',
  fontFamily: '"Syne", sans-serif',
  margin: '0.3rem 0 0',
};
