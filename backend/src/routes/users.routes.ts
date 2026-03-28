import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// List all users (admin only)
router.get('/', authMiddleware, adminOnly, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get single user
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, role: true, active: true, createdAt: true,
        projectMemberships: { include: { project: { select: { id: true, name: true } } } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Create user
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: role || 'CLIENT' },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email già in uso' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// Update user
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, name, role, active, password } = req.body;
    const data: any = {};
    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Delete user
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
