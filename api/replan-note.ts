import Anthropic from '@anthropic-ai/sdk';

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
    const { rolledHours, count } = req.body;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      system: 'You write brief, motivating one-sentence notes about replanning work. Return only the sentence, no quotes.',
      messages: [{
        role: 'user',
        content: `${count} task(s) totalling ${rolledHours} hours rolled over to tomorrow. Write one sentence explaining the situation and encouraging the user.`,
      }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from AI');

    res.json({ note: content.text.trim() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
