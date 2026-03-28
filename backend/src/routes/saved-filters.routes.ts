import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const filters = await prisma.savedFilter.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(filters);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, filters } = req.body;
    if (!name || !filters) return res.status(400).json({ error: 'name e filters obbligatori' });
    const saved = await prisma.savedFilter.create({
      data: { userId: req.user!.userId, name, filters: typeof filters === 'string' ? filters : JSON.stringify(filters) },
    });
    res.status(201).json(saved);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const filter = await prisma.savedFilter.findUnique({ where: { id: req.params.id } });
    if (!filter) return res.status(404).json({ error: 'Filtro non trovato' });
    if (filter.userId !== req.user!.userId) return res.status(403).json({ error: 'Non autorizzato' });
    await prisma.savedFilter.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
