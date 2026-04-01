import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET / - list all rules (admin only)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rules = await (prisma as any).assignmentRule.findMany({
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(rules);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST / - create rule (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, priority, type, assigneeId, isActive, sortOrder } = req.body;
    if (!assigneeId) return res.status(400).json({ error: 'assigneeId obbligatorio' });

    const rule = await (prisma as any).assignmentRule.create({
      data: {
        projectId: projectId || null,
        priority: priority || null,
        type: type || null,
        assigneeId,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    res.status(201).json(rule);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /:id - update rule (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, priority, type, assigneeId, isActive, sortOrder } = req.body;
    const data: any = {};
    if (projectId !== undefined) data.projectId = projectId || null;
    if (priority !== undefined) data.priority = priority || null;
    if (type !== undefined) data.type = type || null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const rule = await (prisma as any).assignmentRule.update({
      where: { id: req.params.id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(rule);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /:id - delete rule (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await (prisma as any).assignmentRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
