import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, 'forge-data.json');

async function callAnthropic(body: unknown): Promise<unknown> {
  const apiKey =
    process.env.VITE_ANTHROPIC_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    '';
  if (!apiKey) throw new Error('MISSING_API_KEY');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }
  return res.json();
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function apiPlugin() {
  return {
    name: 'forge-api',
    configureServer(server: any) {
      // ── /api/decompose-goal ───────────────────────────────────────────────
      server.middlewares.use('/api/decompose-goal', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = JSON.parse(await readBody(req));
          const data = await callAnthropic({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system:
              'You are a goal decomposition assistant. Break a goal into 4–8 clear, actionable milestones. ' +
              'Return ONLY valid JSON: { "subGoals": [{ "title": string, "description": string }] }. ' +
              'No markdown. No preamble.',
            messages: [{
              role: 'user',
              content:
                `Goal: ${body.title}\n` +
                (body.description ? `Description: ${body.description}\n` : '') +
                `Deadline: ${body.deadline}\nPriority: ${body.priority}`,
            }],
          }) as any;
          const text: string = data.content?.[0]?.text ?? '{}';
          res.end(text);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message ?? 'Unknown error' }));
        }
      });
      // ── /api/estimate-time ────────────────────────────────────────────────
      server.middlewares.use('/api/estimate-time', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = JSON.parse(await readBody(req));
          const userPrompt =
            `Goal: ${body.goalTitle}\n` +
            `Priority: ${body.priority}\n` +
            `Deadline: ${body.deadline}\n\n` +
            `Estimate hours for each of these subgoals:\n` +
            (body.subGoals as Array<{ id: string; title: string; description?: string }>)
              .map((sg) => `- ID: ${sg.id} | Title: ${sg.title} | Description: ${sg.description ?? 'N/A'}`)
              .join('\n');

          const data = await callAnthropic({
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
          }) as any;
          const text: string = data.content?.[0]?.text ?? '{}';
          res.end(text);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message ?? 'Unknown error' }));
        }
      });

      // ── /api/replan-note ──────────────────────────────────────────────────
      server.middlewares.use('/api/replan-note', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = JSON.parse(await readBody(req));
          const data = await callAnthropic({
            model: 'claude-sonnet-4-6',
            max_tokens: 100,
            system: 'You write brief, motivating one-sentence notes about replanning work. Return only the sentence, no quotes.',
            messages: [{
              role: 'user',
              content: `${body.count} task(s) totalling ${body.rolledHours} hours rolled over to tomorrow. Write one sentence explaining the situation and encouraging the user.`,
            }],
          }) as any;
          const text: string = data.content?.[0]?.text?.trim() ?? '';
          res.end(JSON.stringify({ note: text }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message ?? 'Unknown error' }));
        }
      });
    },
  };
}

function fileStatePlugin() {
  return {
    name: 'file-state',
    configureServer(server: any) {
      server.middlewares.use('/api/state', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method === 'GET') {
          if (fs.existsSync(DATA_FILE)) {
            res.end(fs.readFileSync(DATA_FILE, 'utf-8'));
          } else {
            res.end('null');
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            fs.writeFileSync(DATA_FILE, body, 'utf-8');
            res.statusCode = 204;
            res.end();
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin(), fileStatePlugin()],
});
