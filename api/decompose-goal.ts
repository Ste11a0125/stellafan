import Anthropic from '@anthropic-ai/sdk';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    return;
  }

  try {
    const { title, description, deadline, priority } = req.body;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20251022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Goal: ${title}\nDescription: ${description || 'None provided'}\nDeadline: ${deadline}\nPriority: ${priority}\n\nGenerate the sub-goal breakdown now.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from AI');

    const parsed = JSON.parse(content.text);
    if (!parsed.subGoals || !Array.isArray(parsed.subGoals)) {
      throw new Error('Invalid AI response format');
    }

    res.json({ subGoals: parsed.subGoals });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
