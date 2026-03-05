import { useState } from 'react';
import type { Goal, Priority } from '../store/useStore';
import { useStore } from '../store/useStore';
import { formatDeadline, priorityColor } from '../lib/utils';
import ProgressBar from './ProgressBar';
import SubGoalItem from './SubGoalItem';

type Props = {
  goal: Goal;
};

type EditableMilestone = {
  id: string;
  title: string;
  description: string;
  isNew?: boolean;
};

export default function GoalCard({ goal }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description ?? '');
  const [editPriority, setEditPriority] = useState<Priority>(goal.priority);
  const [editDeadline, setEditDeadline] = useState(goal.deadline);
  const [editMilestones, setEditMilestones] = useState<EditableMilestone[]>([]);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  const toggleSubGoal = useStore((s) => s.toggleSubGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const updateSubGoal = useStore((s) => s.updateSubGoal);
  const deleteSubGoal = useStore((s) => s.deleteSubGoal);
  const addSubGoal = useStore((s) => s.addSubGoal);

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

  const openModal = () => {
    setEditing(false);
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? '');
    setEditPriority(goal.priority);
    setEditDeadline(goal.deadline);
    setEditMilestones([]);
    setExpandedMilestone(null);
    setModalOpen(true);
  };

  const startEditing = () => {
    setEditMilestones(
      [...goal.subGoals]
        .sort((a, b) => a.order - b.order)
        .map((sg) => ({ id: sg.id, title: sg.title, description: sg.description ?? '' }))
    );
    setExpandedMilestone(null);
    setEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editDeadline) return;

    updateGoal(goal.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priority: editPriority,
      deadline: editDeadline,
    });

    // Sync milestone changes
    const originalIds = new Set(goal.subGoals.map((sg) => sg.id));
    const keptIds = new Set(editMilestones.filter((m) => !m.isNew).map((m) => m.id));

    // Delete removed milestones
    for (const sg of goal.subGoals) {
      if (!keptIds.has(sg.id)) deleteSubGoal(goal.id, sg.id);
    }
    // Update existing milestones
    for (const m of editMilestones) {
      if (!m.isNew && originalIds.has(m.id)) {
        updateSubGoal(goal.id, m.id, { title: m.title, description: m.description || undefined });
      }
    }
    // Add new milestones
    const maxOrder = goal.subGoals.reduce((max, sg) => Math.max(max, sg.order), -1);
    editMilestones
      .filter((m) => m.isNew && m.title.trim())
      .forEach((m, i) => {
        addSubGoal(goal.id, {
          title: m.title.trim(),
          description: m.description.trim() || undefined,
          completed: false,
          order: maxOrder + 1 + i,
          includedInPlan: true,
        });
      });

    setEditing(false);
  };

  const addNewMilestone = () => {
    const tempId = `new-${Date.now()}`;
    setEditMilestones((prev) => [...prev, { id: tempId, title: '', description: '', isNew: true }]);
    setExpandedMilestone(tempId);
  };

  const removeMilestone = (id: string) => {
    setEditMilestones((prev) => prev.filter((m) => m.id !== id));
    if (expandedMilestone === id) setExpandedMilestone(null);
  };

  const updateMilestoneField = (id: string, field: 'title' | 'description', value: string) => {
    setEditMilestones((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditing(false);
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    color: 'var(--text)',
    fontFamily: '"Syne", sans-serif',
    fontSize: '0.9rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.65rem',
    fontFamily: '"DM Mono", monospace',
    color: 'var(--muted)',
    letterSpacing: '0.1em',
    marginBottom: '0.35rem',
  };

  return (
    <>
      <div
        onClick={openModal}
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
                openModal();
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
          onClick={handleClose}
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

              {editing ? (
                /* ── EDIT FORM ── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span style={{ fontFamily: '"Bebas Neue", cursive', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--amber)' }}>
                      EDIT GOAL
                    </span>
                    <button
                      onClick={handleClose}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>GOAL TITLE</label>
                      <input
                        style={inputStyle}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="What do you want to achieve?"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>DESCRIPTION (optional)</label>
                      <textarea
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Add context or motivation..."
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>PRIORITY</label>
                        <select
                          style={inputStyle}
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as Priority)}
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="normal">Normal</option>
                        </select>
                      </div>

                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>DEADLINE</label>
                        <input
                          type="date"
                          style={inputStyle}
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Milestones section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={labelStyle}>MILESTONES</label>
                        <button
                          onClick={addNewMilestone}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 2,
                            color: 'var(--amber)',
                            fontSize: '0.65rem',
                            fontFamily: '"DM Mono", monospace',
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                            padding: '3px 8px',
                          }}
                        >
                          + ADD
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {editMilestones.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              backgroundColor: 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 2,
                              overflow: 'hidden',
                            }}
                          >
                            {/* Row: title + expand + delete */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem' }}>
                              <input
                                style={{
                                  ...inputStyle,
                                  padding: '0.25rem 0.4rem',
                                  fontSize: '0.85rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  flex: 1,
                                }}
                                value={m.title}
                                onChange={(e) => updateMilestoneField(m.id, 'title', e.target.value)}
                                placeholder="Milestone title..."
                              />
                              <button
                                onClick={() => setExpandedMilestone(expandedMilestone === m.id ? null : m.id)}
                                title="Edit description"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: expandedMilestone === m.id ? 'var(--amber)' : 'var(--muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  padding: '0 4px',
                                  flexShrink: 0,
                                }}
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => removeMilestone(m.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--muted)',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  padding: '0 4px',
                                  lineHeight: 1,
                                  flexShrink: 0,
                                }}
                              >
                                ×
                              </button>
                            </div>
                            {/* Description expand */}
                            {expandedMilestone === m.id && (
                              <div style={{ padding: '0 0.6rem 0.5rem' }}>
                                <textarea
                                  style={{
                                    ...inputStyle,
                                    padding: '0.3rem 0.4rem',
                                    fontSize: '0.8rem',
                                    resize: 'vertical',
                                    minHeight: 56,
                                  }}
                                  value={m.description}
                                  onChange={(e) => updateMilestoneField(m.id, 'description', e.target.value)}
                                  placeholder="Optional description..."
                                />
                              </div>
                            )}
                          </div>
                        ))}
                        {editMilestones.length === 0 && (
                          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: '"Syne", sans-serif', margin: 0 }}>
                            No milestones yet. Hit + ADD to create one.
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={!editTitle.trim() || !editDeadline}
                      >
                        SAVE CHANGES
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setEditing(false)}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ── VIEW MODE ── */
                <>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={startEditing}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 2,
                          color: 'var(--muted)',
                          fontSize: '0.7rem',
                          fontFamily: '"DM Mono", monospace',
                          letterSpacing: '0.08em',
                          cursor: 'pointer',
                          padding: '4px 10px',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--amber)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--amber)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                        }}
                      >
                        EDIT
                      </button>
                      <button
                        onClick={handleClose}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
