import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/templates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;
    let where: any = {};

    if (req.user!.role !== 'ADMIN') {
      // Non-admin: see global templates + project-specific if projectId provided
      const orConditions: any[] = [{ projectId: null }];
      if (projectId) orConditions.push({ projectId: projectId as string });
      where = { OR: orConditions };
    } else if (projectId) {
      where = { OR: [{ projectId: null }, { projectId: projectId as string }] };
    }

    const templates = await prisma.ticketTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/templates (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, name, titleTemplate, descriptionTemplate, priority, type } = req.body;
    if (!name || !titleTemplate || !descriptionTemplate) {
      return res.status(400).json({ error: 'name, titleTemplate e descriptionTemplate sono obbligatori' });
    }

    const template = await prisma.ticketTemplate.create({
      data: {
        projectId: projectId || null,
        name,
        titleTemplate,
        descriptionTemplate,
        priority: priority || 'MEDIUM',
        type: type || 'STANDARD',
      },
    });
    res.status(201).json(template);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/templates/:id (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const existing = await prisma.ticketTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Template non trovato' });

    const { projectId, name, titleTemplate, descriptionTemplate, priority, type } = req.body;
    const data: any = {};
    if (projectId !== undefined) data.projectId = projectId || null;
    if (name !== undefined) data.name = name;
    if (titleTemplate !== undefined) data.titleTemplate = titleTemplate;
    if (descriptionTemplate !== undefined) data.descriptionTemplate = descriptionTemplate;
    if (priority !== undefined) data.priority = priority;
    if (type !== undefined) data.type = type;

    const updated = await prisma.ticketTemplate.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/templates/:id (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.ticketTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
