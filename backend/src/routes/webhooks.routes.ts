import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const router = Router();
const prisma = new PrismaClient();

export async function fireWebhooks(
  prismaClient: PrismaClient,
  event: string,
  projectId: string | null,
  payload: object,
) {
  try {
    const where: any = { active: true, events: { contains: event } };
    if (projectId) {
      where.OR = [{ projectId }, { projectId: null }];
    }
    const hooks = await prismaClient.webhook.findMany({ where });

    for (const hook of hooks) {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
      const url = new URL(hook.url);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-GISdesk-Event': event,
          ...(hook.secret ? {
            'X-GISdesk-Signature': 'sha256=' + crypto.createHmac('sha256', hook.secret).update(body).digest('hex'),
          } : {}),
        },
      };
      const req = (url.protocol === 'https:' ? https : http).request(options);
      req.on('error', () => {});
      req.write(body);
      req.end();
    }
  } catch {}
}

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    const hooks = await prisma.webhook.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(hooks);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, name, url, events, secret } = req.body;
    if (!name || !url || !events) return res.status(400).json({ error: 'name, url, events obbligatori' });
    const hook = await prisma.webhook.create({
      data: { projectId: projectId || null, name, url, events: Array.isArray(events) ? events.join(',') : events, secret: secret || null },
    });
    res.status(201).json(hook);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, url, events, secret, active } = req.body;
    const hook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(events && { events: Array.isArray(events) ? events.join(',') : events }),
        ...(secret !== undefined && { secret }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(hook);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Test webhook
router.post('/:id/test', authMiddleware, adminOnly, async (req, res) => {
  try {
    const hook = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!hook) return res.status(404).json({ error: 'Webhook non trovato' });
    await fireWebhooks(prisma, 'test', null, { message: 'GISdesk webhook test' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
