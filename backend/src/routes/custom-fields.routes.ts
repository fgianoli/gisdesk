import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(fields);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { projectId, name, fieldType, required, options } = req.body;
    if (!projectId || !name) return res.status(400).json({ error: 'projectId e name obbligatori' });
    const field = await prisma.customField.create({
      data: { projectId, name, fieldType: fieldType || 'TEXT', required: required || false, options: options || null },
    });
    res.status(201).json(field);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, fieldType, required, options } = req.body;
    const field = await prisma.customField.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(fieldType && { fieldType }), ...(required !== undefined && { required }), ...(options !== undefined && { options }) },
    });
    res.json(field);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.customField.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

// Get/set field values for a ticket
router.get('/ticket/:ticketId', authMiddleware, async (req, res) => {
  try {
    const values = await prisma.customFieldValue.findMany({
      where: { ticketId: req.params.ticketId },
      include: { customField: true },
    });
    res.json(values);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/ticket/:ticketId/values', authMiddleware, async (req, res) => {
  try {
    const { values } = req.body; // [{ customFieldId, value }]
    if (!Array.isArray(values)) return res.status(400).json({ error: 'values deve essere un array' });

    const results = await Promise.all(
      values.map((v: { customFieldId: string; value: string }) =>
        prisma.customFieldValue.upsert({
          where: { customFieldId_ticketId: { customFieldId: v.customFieldId, ticketId: req.params.ticketId } },
          create: { customFieldId: v.customFieldId, ticketId: req.params.ticketId, value: v.value },
          update: { value: v.value },
        })
      )
    );
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
