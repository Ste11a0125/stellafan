export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? '';
  if (!apiKey) { res.status(500).json({ error: 'MISSING_API_KEY' }); return; }

  const { rolledHours, count } = req.body;
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
        max_tokens: 100,
        system: 'You write brief, motivating one-sentence notes about replanning work. Return only the sentence, no quotes.',
        messages: [{
          role: 'user',
          content: `${count} task(s) totalling ${rolledHours} hours rolled over to tomorrow. Write one sentence explaining the situation and encouraging the user.`,
        }],
      }),
    });

    if (!apiRes.ok) {
      res.status(500).json({ error: `Anthropic error ${apiRes.status}` });
      return;
    }

    const data = await apiRes.json();
    const note = data.content?.[0]?.text?.trim() ?? '';
    res.json({ note });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
