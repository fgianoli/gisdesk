import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/bulk/tickets
router.post('/tickets', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids) || !action) {
      return res.status(400).json({ error: 'ids e action obbligatori' });
    }

    let updated = 0;
    if (action === 'close') {
      const r = await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { status: 'CLOSED' } });
      updated = r.count;
    } else if (action === 'resolve') {
      const r = await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { status: 'RESOLVED' } });
      updated = r.count;
    } else if (action === 'assign' && value) {
      const r = await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { assigneeId: value } });
      updated = r.count;
    } else if (action === 'priority' && value) {
      const r = await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { priority: value } });
      updated = r.count;
    } else if (action === 'delete') {
      const r = await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
      updated = r.count;
    }

    res.json({ updated });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
