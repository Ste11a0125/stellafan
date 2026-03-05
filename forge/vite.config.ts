import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve(__dirname, 'forge-data.json');

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
  plugins: [react(), fileStatePlugin()],
});
