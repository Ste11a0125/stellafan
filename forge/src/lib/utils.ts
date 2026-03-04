export function uuid(): string {
  return crypto.randomUUID();
}

export function formatDeadline(deadline: string): string {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return '#ff5c1a';
    case 'high': return '#f5a623';
    case 'normal': return '#2affa0';
    default: return '#f5a623';
  }
}

export function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}
