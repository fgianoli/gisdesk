import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const SUBTASK_INCLUDE = {
  todo: { select: { id: true, title: true, completed: true } },
  subTasks: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      todo: { select: { id: true, title: true, completed: true } },
    },
  },
};

// Ricalcola il progresso del parent in base ai subtask
async function recalcParentProgress(parentId: string) {
  const subs = await prisma.timelineItem.findMany({
    where: { parentId },
    select: { status: true, progress: true },
  });
  if (subs.length === 0) return;

  const doneSubs = subs.filter(s => s.status === 'DONE').length;
  const newProgress = Math.round((doneSubs / subs.length) * 100);
  const newStatus =
    doneSubs === subs.length ? 'DONE' :
    doneSubs > 0 || subs.some(s => s.status === 'IN_PROGRESS') ? 'IN_PROGRESS' :
    'TODO';

  await prisma.timelineItem.update({
    where: { id: parentId },
    data: { progress: newProgress, status: newStatus },
  });
}

// GET /api/timeline/project/:projectId — solo root items con subtasks inclusi
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.timelineItem.findMany({
      where: { projectId: req.params.projectId, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      include: SUBTASK_INCLUDE,
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/timeline — crea task o subtask (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, parentId, title, description, startDate, endDate, status, sortOrder, progress, color, todoId } = req.body;
    const item = await prisma.timelineItem.create({
      data: {
        projectId,
        parentId: parentId || null,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'TODO',
        sortOrder: sortOrder || 0,
        progress: progress ?? 0,
        color: color || null,
        todoId: todoId || null,
      },
      include: SUBTASK_INCLUDE,
    });
    // Se è un subtask, aggiorna il progresso del parent
    if (parentId) await recalcParentProgress(parentId);
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/timeline/:id — aggiorna task (admin: tutto; member: solo status/progress)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, startDate, endDate, status, sortOrder, progress, color, todoId, parentId } = req.body;
    const user = (req as any).user;
    const data: any = {};

    if (user.role === 'ADMIN') {
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description || null;
      if (startDate !== undefined) data.startDate = new Date(startDate);
      if (endDate !== undefined) data.endDate = new Date(endDate);
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      if (color !== undefined) data.color = color || null;
      if (todoId !== undefined) data.todoId = todoId || null;
      if (parentId !== undefined) data.parentId = parentId || null;
    }
    if (status !== undefined) data.status = status;
    if (progress !== undefined) data.progress = Number(progress);

    const item = await prisma.timelineItem.update({
      where: { id: req.params.id },
      data,
      include: SUBTASK_INCLUDE,
    });

    // Se ha un parent, ricalcola il progresso del parent
    if (item.parentId) await recalcParentProgress(item.parentId);

    res.json(item);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/timeline/reorder/:projectId
router.put('/reorder/:projectId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await prisma.timelineItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/timeline/:id (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const item = await prisma.timelineItem.findUnique({ where: { id: req.params.id }, select: { parentId: true } });
    await prisma.timelineItem.delete({ where: { id: req.params.id } });
    if (item?.parentId) await recalcParentProgress(item.parentId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
