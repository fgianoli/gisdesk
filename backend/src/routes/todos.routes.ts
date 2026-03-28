import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get todos for a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { projectId: req.params.projectId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(todos);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create todo (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, title, userId, dueDate, recurrence } = req.body;
    const todo = await prisma.todo.create({
      data: {
        projectId,
        title,
        userId: userId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrence: recurrence || 'NONE',
      },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(todo);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update todo
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, completed, userId, dueDate, recurrence } = req.body;

    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Todo non trovato' });

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (completed !== undefined) data.completed = completed;
    if (userId !== undefined) data.userId = userId || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (recurrence !== undefined) data.recurrence = recurrence;

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    // Handle recurring todo: when completed becomes true and recurrence is set
    if (completed === true && existing.completed === false) {
      const currentRecurrence = recurrence !== undefined ? recurrence : existing.recurrence;
      if (currentRecurrence && currentRecurrence !== 'NONE') {
        const baseDate = existing.dueDate ? new Date(existing.dueDate) : new Date();
        const nextDate = new Date(baseDate);
        if (currentRecurrence === 'WEEKLY') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (currentRecurrence === 'MONTHLY') {
          nextDate.setDate(nextDate.getDate() + 30);
        }
        await prisma.todo.create({
          data: {
            projectId: existing.projectId,
            userId: existing.userId,
            title: existing.title,
            completed: false,
            dueDate: nextDate,
            recurrence: currentRecurrence,
          },
        });
      }
    }

    res.json(todo);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete todo (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
