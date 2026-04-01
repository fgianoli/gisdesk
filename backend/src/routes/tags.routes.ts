import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tags - list all tags
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/tags - create tag (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });
    const tag = await prisma.tag.create({
      data: { name, color: color || '#6366f1' },
    });
    res.status(201).json(tag);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Tag già esistente' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/tags/:id - delete tag (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/tags/ticket/:ticketId - add tag to ticket (admin)
router.post('/ticket/:ticketId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { tagId } = req.body;
    if (!tagId) return res.status(400).json({ error: 'tagId è obbligatorio' });
    const ticketTag = await prisma.ticketTag.create({
      data: { ticketId: req.params.ticketId, tagId },
      include: { tag: true },
    });
    res.status(201).json(ticketTag);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Tag già associato al ticket' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/tags/ticket/:ticketId/:tagId - remove tag from ticket (admin)
router.delete('/ticket/:ticketId/:tagId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.ticketTag.delete({
      where: { ticketId_tagId: { ticketId: req.params.ticketId, tagId: req.params.tagId } },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
