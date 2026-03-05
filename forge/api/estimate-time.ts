export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? '';
  if (!apiKey) { res.status(500).json({ error: 'MISSING_API_KEY' }); return; }

  const body = req.body;
  const subGoals: Array<{ id: string; title: string; description?: string }> = body.subGoals ?? [];

  const userPrompt =
    `Goal: ${body.goalTitle}\n` +
    `Priority: ${body.priority}\n` +
    `Deadline: ${body.deadline}\n\n` +
    `Estimate hours for each of these subgoals:\n` +
    subGoals
      .map((sg) => `- ID: ${sg.id} | Title: ${sg.title} | Description: ${sg.description ?? 'N/A'}`)
      .join('\n');

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system:
          'You are a realistic project time estimator. You estimate how many hours a motivated but non-expert person would need to complete a milestone, working in focused sessions.\n\n' +
          'Rules:\n' +
          '- Be realistic, not optimistic. Add 20% buffer to your raw estimate.\n' +
          '- Minimum estimate: 0.5 hours. Maximum: 8 hours per subgoal.\n' +
          '- If a subgoal is vague, estimate on the higher end.\n' +
          '- Return ONLY valid JSON. No markdown. No preamble.\n\n' +
          'JSON schema:\n' +
          '{\n' +
          '  "estimates": [\n' +
          '    {\n' +
          '      "subGoalId": string,\n' +
          '      "estimatedHours": number,\n' +
          '      "confidenceLevel": "low" | "medium" | "high",\n' +
          '      "reasoning": string\n' +
          '    }\n' +
          '  ]\n' +
          '}',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      res.status(500).json({ error: `Anthropic error ${apiRes.status}: ${text}` });
      return;
    }

    const data = await apiRes.json();
    const text = data.content?.[0]?.text ?? '{}';
    res.setHeader('Content-Type', 'application/json');
    res.end(text);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
