import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET / - list all (authenticated)
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const responses = await prisma.cannedResponse.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    res.json(responses);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST / - create (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, content, category, sortOrder } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title e content sono obbligatori' });
    }
    const response = await prisma.cannedResponse.create({
      data: {
        title,
        content,
        category: category || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      },
    });
    res.status(201).json(response);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /:id - update (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, content, category, sortOrder } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category || null;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

    const response = await prisma.cannedResponse.update({
      where: { id: req.params.id },
      data,
    });
    res.json(response);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /:id - delete (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.cannedResponse.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
