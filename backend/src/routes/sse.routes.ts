import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const router = Router();

// Map of userId -> array of Response objects (multiple tabs)
const clients = new Map<string, Response[]>();

export function pushEvent(userId: string, event: string, data: object) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  userClients.forEach(res => {
    try { res.write(msg); } catch {}
  });
}

export function pushEventToAll(event: string, data: object) {
  clients.forEach((resArr) => {
    resArr.forEach(res => {
      try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
    });
  });
}

router.get('/subscribe', (req: Request, res: Response) => {
  const token = (req.headers.authorization?.replace('Bearer ', '') || req.query.token) as string;
  if (!token) return res.status(401).json({ error: 'Token mancante' });

  let userId: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    userId = payload.userId;
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial ping
  res.write('event: connected\ndata: {"ok":true}\n\n');

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch {}
  }, 30000);

  // Register client
  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId)!.push(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    const arr = clients.get(userId) || [];
    const idx = arr.indexOf(res);
    if (idx !== -1) arr.splice(idx, 1);
    if (arr.length === 0) clients.delete(userId);
  });
});

export default router;
