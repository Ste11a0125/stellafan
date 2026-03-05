export type AISubGoal = {
  title: string;
  description: string;
};

export async function decomposeGoal(goal: {
  title: string;
  description?: string;
  deadline: string;
  priority: string;
}): Promise<AISubGoal[]> {
  const res = await fetch('/api/decompose-goal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Server error ${res.status}`);
  }

  return data.subGoals;
}
