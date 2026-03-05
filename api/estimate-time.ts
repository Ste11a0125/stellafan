import Anthropic from '@anthropic-ai/sdk';

const systemPrompt = `You are a realistic project time estimator. You estimate how many hours a motivated but non-expert person would need to complete a milestone, working in focused sessions.

Rules:
- Be realistic, not optimistic. Add 20% buffer to your raw estimate.
- Minimum estimate: 0.5 hours. Maximum: 8 hours per subgoal.
- If a subgoal is vague, estimate on the higher end.
- Return ONLY valid JSON. No markdown. No preamble.

JSON schema:
{
  "estimates": [
    {
      "subGoalId": string,
      "estimatedHours": number,
      "confidenceLevel": "low" | "medium" | "high",
      "reasoning": string
    }
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
    const { goalTitle, priority, deadline, subGoals } = req.body;

    const userPrompt =
      `Goal: ${goalTitle}\nPriority: ${priority}\nDeadline: ${deadline}\n\n` +
      `Estimate hours for each of these subgoals:\n` +
      (subGoals as Array<{ id: string; title: string; description?: string }>)
        .map((sg) => `- ID: ${sg.id} | Title: ${sg.title} | Description: ${sg.description ?? 'N/A'}`)
        .join('\n');

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from AI');

    const jsonText = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
