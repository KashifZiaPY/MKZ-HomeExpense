import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SCRIPT_URL =
  process.env.VITE_API_URL ||
  'https://script.google.com/macros/s/AKfycbxHrb1p8HKzj-_h0DeWL3_blCirI3ado4DgHtiOGv0X5NTuQBDRyF0kBoU-pzH_pnPkAg/exec';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy GET requests to Google Apps Script Web App
  app.get('/api/proxy', async (req, res) => {
    try {
      const action = (req.query.action as string) || 'dashboard';
      const targetUrl = (req.query.targetUrl as string) || DEFAULT_SCRIPT_URL;

      const url = new URL(targetUrl);
      url.searchParams.set('action', action);

      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Zia-Household-Expense-App/1.0',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Google Apps Script returned status ${response.status}: ${response.statusText}`,
        });
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        return res.status(502).json({
          error: 'Google Apps Script did not return valid JSON. Check Web App permissions.',
          rawResponse: text.substring(0, 500),
        });
      }
    } catch (err: any) {
      console.error('Proxy GET error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to proxy GET request to Google Apps Script',
      });
    }
  });

  // Proxy POST requests to Google Apps Script Web App
  app.post('/api/proxy', async (req, res) => {
    try {
      const { action, payload, targetUrl, pin } = req.body;
      const scriptUrl = targetUrl || DEFAULT_SCRIPT_URL;

      const postBody = JSON.stringify({
        action,
        payload,
        pin,
      });

      const response = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          Accept: 'application/json',
          'User-Agent': 'Zia-Household-Expense-App/1.0',
        },
        body: postBody,
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Google Apps Script returned status ${response.status}: ${response.statusText}`,
        });
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        return res.status(502).json({
          error: 'Google Apps Script did not return valid JSON. Check Web App permissions.',
          rawResponse: text.substring(0, 500),
        });
      }
    } catch (err: any) {
      console.error('Proxy POST error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to proxy POST request to Google Apps Script',
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zia Expense server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
