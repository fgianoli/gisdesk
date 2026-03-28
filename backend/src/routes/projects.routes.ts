import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// List projects (admin: all, client: only assigned)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = req.user!.role === 'ADMIN'
      ? {}
      : { members: { some: { userId: req.user!.userId } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        _count: { select: { tickets: true, todos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        _count: { select: { tickets: true, todos: true, faqs: true, documents: true } },
      },
    });
    if (!project) return res.status(404).json({ error: 'Progetto non trovato' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create project (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, startDate, endDate, slaHours } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        slaHours: slaHours || 24,
      },
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update project (admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, slaHours } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (slaHours !== undefined) data.slaHours = slaHours;

    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete project (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Add member to project
router.post('/:id/members', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const member = await prisma.projectUser.create({
      data: { projectId: req.params.id, userId, role: role || 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    res.status(201).json(member);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Utente già nel progetto' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.projectUser.deleteMany({
      where: { projectId: req.params.id, userId: req.params.userId },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
