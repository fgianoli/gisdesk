import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dependencies/ticket/:ticketId
router.get('/ticket/:ticketId', authMiddleware, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trovato' });

    const blockedBy = await prisma.ticketDependency.findMany({
      where: { ticketId: req.params.ticketId },
      include: {
        dependsOn: { select: { id: true, title: true, status: true } },
      },
    });

    const blocks = await prisma.ticketDependency.findMany({
      where: { dependsOnId: req.params.ticketId },
      include: {
        ticket: { select: { id: true, title: true, status: true } },
      },
    });

    res.json({ blockedBy, blocks });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/dependencies
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { ticketId, dependsOnId } = req.body;
    if (!ticketId || !dependsOnId) {
      return res.status(400).json({ error: 'ticketId e dependsOnId sono obbligatori' });
    }
    if (ticketId === dependsOnId) {
      return res.status(400).json({ error: 'Un ticket non può dipendere da se stesso' });
    }

    const [ticket, dependsOn] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: ticketId } }),
      prisma.ticket.findUnique({ where: { id: dependsOnId } }),
    ]);
    if (!ticket || !dependsOn) return res.status(404).json({ error: 'Ticket non trovato' });

    const dep = await prisma.ticketDependency.create({
      data: { ticketId, dependsOnId },
      include: {
        ticket: { select: { id: true, title: true, status: true } },
        dependsOn: { select: { id: true, title: true, status: true } },
      },
    });
    res.status(201).json(dep);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Dipendenza già esistente' });
    }
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/dependencies/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dep = await prisma.ticketDependency.findUnique({ where: { id: req.params.id } });
    if (!dep) return res.status(404).json({ error: 'Dipendenza non trovata' });

    await prisma.ticketDependency.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
