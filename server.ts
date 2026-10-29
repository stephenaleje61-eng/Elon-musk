import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_EMAIL = 'elonmuskspace241@gmail.com';
const AUTHORIZED_ADMIN_EMAILS = [
  'elonmuskspace241@gmail.com',
  'biologyboyboy@gmail.com',
];

app.use(express.json());

// Backend deletion verification endpoint
app.post('/api/admin/verify-action', (req: Request, res: Response): any => {
  const { userEmail, action, visitorId } = req.body;
  const isAuthorized = userEmail && AUTHORIZED_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail.toLowerCase());
  if (!isAuthorized) {
    console.warn(`[SECURITY] Unauthorized deletion attempt by: ${userEmail || 'anonymous'}`);
    return res.status(403).json({
      success: false,
      error: `Access Denied: Only authorized administrators (${ADMIN_EMAIL}) can perform this operation.`,
    });
  }

  // Safe server-side audit logging without leaking private message payloads
  console.log(`[ADMIN AUDIT] Authorized action '${action}' on visitor '${visitorId}' by ${userEmail} at ${new Date().toISOString()}`);
  return res.json({
    success: true,
    authorized: true,
    timestamp: new Date().toISOString(),
  });
});

// Vite Middleware integration for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ELONVERSE Server running on port ${PORT}`);
  });
}

startServer();
