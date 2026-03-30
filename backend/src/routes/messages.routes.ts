import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { pushEvent } from './sse.routes';

const router = Router();
const prisma = new PrismaClient();

const userSelect = { id: true, name: true, email: true, avatar: true };

// Verifica che l'utente sia membro del progetto (o admin)
async function canAccessProject(userId: string, projectId: string, role: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectUser.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return !!membership;
}

// GET /api/messages/:projectId — lista messaggi
router.get('/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const allowed = await canAccessProject(req.user!.userId, projectId, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Non autorizzato' });

    const messages = await prisma.projectMessage.findMany({
      where: { projectId },
      include: { user: { select: userSelect } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }],
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/messages/:projectId — nuovo messaggio
router.post('/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: 'Contenuto obbligatorio' });

    const allowed = await canAccessProject(req.user!.userId, projectId, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Non autorizzato' });

    const message = await prisma.projectMessage.create({
      data: { projectId, userId: req.user!.userId, content: content.trim() },
      include: { user: { select: userSelect } },
    });

    // Notifica real-time a tutti i membri del progetto via SSE
    const members = await prisma.projectUser.findMany({ where: { projectId } });
    for (const m of members) {
      if (m.userId !== req.user!.userId) {
        pushEvent(m.userId, 'board_message', { projectId, message });
      }
    }

    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PATCH /api/messages/:projectId/:id/pin — fissa/sblocca messaggio (admin o manager)
router.patch('/:projectId/:id/pin', authMiddleware, async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const allowed = await canAccessProject(req.user!.userId, projectId, req.user!.role);
    if (!allowed) return res.status(403).json({ error: 'Non autorizzato' });

    // Solo admin o manager del progetto possono pinnare
    if (req.user!.role !== 'ADMIN') {
      const membership = await prisma.projectUser.findUnique({
        where: { userId_projectId: { userId: req.user!.userId, projectId } },
      });
      if (membership?.role !== 'MANAGER') return res.status(403).json({ error: 'Solo i manager possono fissare messaggi' });
    }

    const existing = await prisma.projectMessage.findUnique({ where: { id } });
    if (!existing || existing.projectId !== projectId) return res.status(404).json({ error: 'Messaggio non trovato' });

    const updated = await prisma.projectMessage.update({
      where: { id },
      data: { pinned: !existing.pinned },
      include: { user: { select: userSelect } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/messages/:projectId/:id — modifica messaggio (solo autore)
router.put('/:projectId/:id', authMiddleware, async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Contenuto obbligatorio' });

    const existing = await prisma.projectMessage.findUnique({ where: { id } });
    if (!existing || existing.projectId !== projectId) return res.status(404).json({ error: 'Messaggio non trovato' });
    if (existing.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Puoi modificare solo i tuoi messaggi' });
    }

    const updated = await prisma.projectMessage.update({
      where: { id },
      data: { content: content.trim() },
      include: { user: { select: userSelect } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/messages/:projectId/:id — elimina (autore o admin/manager)
router.delete('/:projectId/:id', authMiddleware, async (req, res) => {
  try {
    const { projectId, id } = req.params;

    const existing = await prisma.projectMessage.findUnique({ where: { id } });
    if (!existing || existing.projectId !== projectId) return res.status(404).json({ error: 'Messaggio non trovato' });

    const isAuthor = existing.userId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAuthor && !isAdmin) {
      const membership = await prisma.projectUser.findUnique({
        where: { userId_projectId: { userId: req.user!.userId, projectId } },
      });
      if (membership?.role !== 'MANAGER') return res.status(403).json({ error: 'Non autorizzato' });
    }

    await prisma.projectMessage.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
