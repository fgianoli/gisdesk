import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly, adminOrProjectAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all todos for the current user (admin/project_admin dashboard)
router.get('/', authMiddleware, adminOrProjectAdmin, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    // Get projects where user is a member
    const memberships = await prisma.projectUser.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map(m => m.projectId);

    // ADMIN sees all todos; PROJECT_ADMIN sees todos in their projects
    const where: any = role === 'ADMIN'
      ? {}
      : { projectId: { in: projectIds } };

    const todos = await prisma.todo.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(todos);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get todos for a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { projectId: req.params.projectId },
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, title: true } },
      },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(todos);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create todo (admin or project_admin)
router.post('/', authMiddleware, adminOrProjectAdmin, async (req, res) => {
  try {
    const { projectId, title, userId, dueDate, recurrence, ticketId } = req.body;
    const todo = await prisma.todo.create({
      data: {
        projectId,
        title,
        userId: userId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrence: recurrence || 'NONE',
        ticketId: ticketId || null,
      },
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, title: true } },
      },
    });
    res.status(201).json(todo);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update todo
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, completed, userId, dueDate, recurrence, ticketId } = req.body;

    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Todo non trovato' });

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (completed !== undefined) data.completed = completed;
    if (userId !== undefined) data.userId = userId || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (recurrence !== undefined) data.recurrence = recurrence;
    if (ticketId !== undefined) data.ticketId = ticketId || null;

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data,
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, title: true } },
      },
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
            ticketId: existing.ticketId,
          },
        });
      }
    }

    res.json(todo);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete todo (admin or project_admin)
router.delete('/:id', authMiddleware, adminOrProjectAdmin, async (req, res) => {
  try {
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
