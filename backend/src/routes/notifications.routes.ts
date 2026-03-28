import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Helper to create a notification
export async function createNotification(
  prismaClient: PrismaClient,
  userId: string,
  type: string,
  title: string,
  body?: string,
  linkUrl?: string,
) {
  try {
    await prismaClient.notification.create({
      data: { userId, type, title, body: body || null, linkUrl: linkUrl || null },
    });
  } catch (err) {
    console.error('[NOTIFICATION ERROR]', err);
  }
}

// GET /api/notifications - list notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, read: false },
    });
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/notifications/read-all - must come BEFORE /:id/read to avoid route conflict
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: 'Notifica non trovata' });
    if (notification.userId !== req.user!.userId) return res.status(403).json({ error: 'Accesso negato' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
