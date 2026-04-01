import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/time-entries/export - export CSV (admin only)
router.get('/export', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, userId, from, to } = req.query;
    const where: any = {};

    if (projectId) where.ticket = { ...(where.ticket || {}), projectId };
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        ticket: { include: { project: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const escCsv = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const headers = ['Ticket', 'Progetto', 'Agente', 'Minuti', 'Ore', 'Note', 'Data'];
    const rows = entries.map((e) => [
      escCsv(e.ticket?.title || ''),
      escCsv(e.ticket?.project?.name || ''),
      escCsv(e.user?.name || ''),
      escCsv(String(e.minutes)),
      escCsv((e.minutes / 60).toFixed(2)),
      escCsv(e.note || ''),
      escCsv(new Date(e.createdAt).toLocaleDateString('it-IT')),
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="time_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

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
