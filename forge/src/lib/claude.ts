import Anthropic from '@anthropic-ai/sdk';

export type AISubGoal = {
  title: string;
  description: string;
};

const systemPrompt = `You are a world-class productivity strategist and life coach.
Your job is to break down a big goal into 5–8 concrete, actionable sub-goals (milestones).

Rules:
- Each sub-goal should be a meaningful milestone, not a micro-task
- Sub-goals should be sequential and build on each other
- Tone: energetic, empowering, second-person ("Define your...", "Build your...")
- Each must have a short title (max 8 words) and a one-sentence description (max 20 words)
- Return ONLY valid JSON. No markdown, no preamble.

JSON schema:
{
  "subGoals": [
    { "title": string, "description": string }
  ]
}`;

export async function decomposeGoal(goal: {
  title: string;
  description?: string;
  deadline: string;
  priority: string;
}): Promise<AISubGoal[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const userPrompt = `Goal: ${goal.title}
Description: ${goal.description || 'None provided'}
Deadline: ${goal.deadline}
Priority: ${goal.priority}

Generate the sub-goal breakdown now.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const parsed = JSON.parse(content.text);
  if (!parsed.subGoals || !Array.isArray(parsed.subGoals)) {
    throw new Error('Invalid AI response format');
  }

  return parsed.subGoals;
}
