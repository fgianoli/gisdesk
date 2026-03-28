import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/time-entries/ticket/:ticketId
router.get('/ticket/:ticketId', authMiddleware, async (req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { ticketId: req.params.ticketId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/time-entries
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { ticketId, minutes, note } = req.body;
    if (!ticketId || !minutes || minutes <= 0) {
      return res.status(400).json({ error: 'ticketId e minutes (> 0) sono obbligatori' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const entry = await prisma.timeEntry.create({
      data: {
        ticketId,
        userId: req.user!.userId,
        minutes: Number(minutes),
        note: note || null,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/time-entries/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ error: 'Entry non trovata' });

    if (entry.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
